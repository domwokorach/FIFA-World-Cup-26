/** the World Cup trophy (replaces the 🏆 emoji app-wide); AI-generated
 * public-domain image — see COPYRIGHT.md */
export default function Trophy({ size = 16 }: { size?: number }) {
  return (
    <img
      className="trophy-img"
      src="/icons/trophy.png"
      alt=""
      height={size}
      width={Math.round(size * (55 / 128))}
      loading="lazy"
    />
  )
}
