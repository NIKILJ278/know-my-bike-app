// Wordmark-only brand mark — "Know My" in ink/white, "Bike" in amber —
// matching the direction approved for the app. Used on auth + splash
// screens instead of the icon mark.
export default function Wordmark({ size = 32, className = '' }) {
  return (
    <div className={`font-display font-extrabold leading-none ${className}`} style={{ fontSize: size }}>
      <span>Know My </span>
      <span className="text-amber-dark dark:text-amber">Bike</span>
    </div>
  )
}
