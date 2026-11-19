export function ScoreRing({ score, size = 150, className = '' }) {
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)

  return (
    <div className={`score-ring ${className}`} style={{ width: size, height: size }} role="img" aria-label={`Match score ${score} out of 100`}>
      <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
        <circle className="score-ring-track" cx="60" cy="60" r={radius} />
        <circle className="score-ring-value" cx="60" cy="60" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div className="score-ring-label"><strong>{score}<span>%</span></strong><small>match score</small></div>
    </div>
  )
}
