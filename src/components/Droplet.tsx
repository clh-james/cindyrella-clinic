export function Droplet({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 0C12 0 22 14.5 22 21C22 27.075 17.075 32 11 32C4.925 32 0 27.075 0 21C0 14.5 12 0 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}
