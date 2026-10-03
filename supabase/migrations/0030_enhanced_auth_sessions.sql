-- Drop the old table created in 0029 to apply the strict requested schema
DROP TABLE IF EXISTS public.user_sessions CASCADE;

-- A. user_sessions — Session Lifecycle Tracking
CREATE TABLE public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE RESTRICT,

    branch_id UUID
        REFERENCES public.branches(id) ON DELETE SET NULL,

    -- Session identification (never store actual auth tokens)
    session_ref UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),

    -- Lifecycle timestamps (UTC)
    login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_activity_at TIMESTAMPTZ,
    logout_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Session duration in seconds, finalized at termination
    duration_seconds BIGINT,

    -- Client metadata
    ip_address INET,
    user_agent TEXT,
    device_type TEXT,
    device_name TEXT,
    browser TEXT,
    browser_version TEXT,
    operating_system TEXT,

    -- Session state
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN (
            'ACTIVE',
            'LOGGED_OUT',
            'SESSION_EXPIRED',
            'FORCE_LOGGED_OUT',
            'REVOKED'
        )),

    logout_reason TEXT
        CHECK (logout_reason IS NULL OR logout_reason IN (
            'USER_LOGOUT',
            'SESSION_TIMEOUT',
            'TOKEN_EXPIRED',
            'ADMIN_FORCE_LOGOUT',
            'PASSWORD_RESET',
            'ACCOUNT_DISABLED',
            'SECURITY_REVOCATION'
        )),

    -- Force logout tracking
    terminated_by UUID
        REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Data integrity
    CONSTRAINT valid_session_timestamps CHECK (
        (logout_at IS NULL OR logout_at >= login_at)
        AND (last_activity_at IS NULL OR last_activity_at >= login_at)
        AND (expires_at IS NULL OR expires_at >= login_at)
    ),

    CONSTRAINT valid_session_duration CHECK (
        duration_seconds IS NULL OR duration_seconds >= 0
    ),

    CONSTRAINT valid_session_state CHECK (
        (status = 'ACTIVE' AND logout_at IS NULL
            AND duration_seconds IS NULL
            AND logout_reason IS NULL)
        OR
        (status <> 'ACTIVE' AND logout_at IS NOT NULL
            AND duration_seconds IS NOT NULL
            AND logout_reason IS NOT NULL)
    )
);

-- Session indexes
CREATE INDEX idx_user_sessions_user
    ON public.user_sessions(user_id, login_at DESC);

CREATE INDEX idx_user_sessions_branch
    ON public.user_sessions(branch_id, login_at DESC);

CREATE INDEX idx_user_sessions_status
    ON public.user_sessions(status, last_activity_at DESC);

CREATE INDEX idx_user_sessions_login
    ON public.user_sessions(login_at DESC);

CREATE INDEX idx_user_sessions_active
    ON public.user_sessions(user_id, last_activity_at DESC)
    WHERE status = 'ACTIVE';

-- B. auth_events — Immutable Authentication Event History
CREATE TABLE public.auth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Actor who triggered the event.
    -- NULL is allowed for failed logins with no authenticated user.
    user_id UUID
        REFERENCES auth.users(id) ON DELETE SET NULL,

    -- User account targeted by an action, if different from actor
    target_user_id UUID
        REFERENCES auth.users(id) ON DELETE SET NULL,

    branch_id UUID
        REFERENCES public.branches(id) ON DELETE SET NULL,

    session_id UUID
        REFERENCES public.user_sessions(id) ON DELETE SET NULL,

    -- Event classification
    event_type TEXT NOT NULL
        CHECK (event_type IN (
            'LOGIN_SUCCESS',
            'LOGIN_FAILED',
            'LOGOUT',
            'SESSION_EXPIRED',
            'FORCE_LOGOUT',
            'SESSION_REVOKED',
            'PASSWORD_CHANGED',
            'PASSWORD_RESET_REQUESTED',
            'PASSWORD_RESET_COMPLETED',
            'ACCOUNT_LOCKED',
            'ACCOUNT_UNLOCKED',
            'ACCOUNT_DISABLED',
            'ACCOUNT_ENABLED'
        )),

    -- Outcome and explanation
    outcome TEXT NOT NULL
        CHECK (outcome IN (
            'SUCCESS',
            'FAILURE',
            'DENIED',
            'PENDING'
        )),

    reason_code TEXT,
    description TEXT,

    -- Timestamp of event in UTC
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Client metadata
    ip_address INET,
    user_agent TEXT,
    device_type TEXT,
    browser TEXT,
    operating_system TEXT,

    -- Safe contextual metadata only.
    -- Never store credentials, access tokens, or secrets.
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(metadata) = 'object'),

    -- Correlation ID for tracing a sequence of related events
    correlation_id UUID,

    -- Server-generated event source
    source TEXT NOT NULL DEFAULT 'APPLICATION'
        CHECK (source IN (
            'APPLICATION',
            'AUTH_PROVIDER',
            'ADMIN_ACTION',
            'SYSTEM'
        )),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Authentication event indexes
CREATE INDEX idx_auth_events_user
    ON public.auth_events(user_id, occurred_at DESC);

CREATE INDEX idx_auth_events_target
    ON public.auth_events(target_user_id, occurred_at DESC);

CREATE INDEX idx_auth_events_branch
    ON public.auth_events(branch_id, occurred_at DESC);

CREATE INDEX idx_auth_events_type
    ON public.auth_events(event_type, occurred_at DESC);

CREATE INDEX idx_auth_events_session
    ON public.auth_events(session_id, occurred_at DESC);

CREATE INDEX idx_auth_events_correlation
    ON public.auth_events(correlation_id)
    WHERE correlation_id IS NOT NULL;

CREATE INDEX idx_auth_events_failed_login
    ON public.auth_events(occurred_at DESC)
    WHERE event_type = 'LOGIN_FAILED';

-- F. Updated-at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_sessions_updated_at ON public.user_sessions;
CREATE TRIGGER trg_user_sessions_updated_at
BEFORE UPDATE ON public.user_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- G. Append-only enforcement for auth_events
CREATE OR REPLACE FUNCTION public.prevent_auth_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Authentication event history is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_events_immutable ON public.auth_events;
CREATE TRIGGER trg_auth_events_immutable
BEFORE UPDATE OR DELETE ON public.auth_events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_auth_event_mutation();

-- H. Row Level Security (RLS)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

-- Create policies based on existing RBAC
-- Super Admin can see everything
CREATE POLICY "Super Admins can view all sessions" 
ON public.user_sessions FOR SELECT 
USING (
    public.has_permission(auth.uid(), 'security.view_login_activity')
);

CREATE POLICY "Super Admins can view all auth events" 
ON public.auth_events FOR SELECT 
USING (
    public.has_permission(auth.uid(), 'security.view_audit_logs')
);

-- Note: We can implement more granular branch isolation policies later if needed.
