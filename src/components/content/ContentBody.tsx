type Props = { body: string };
export function ContentBody({ body }: Props) {
  const blocks = body.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
  return <div className="space-y-5 text-[17px] leading-8 text-neutral-700">{blocks.map((block, index) => {
    if (block.startsWith("## ")) return <h2 key={index} className="pt-5 text-2xl font-black tracking-[-.035em] text-neutral-950">{block.slice(3)}</h2>;
    if (block.startsWith("### ")) return <h3 key={index} className="pt-3 text-xl font-black text-neutral-950">{block.slice(4)}</h3>;
    return <p key={index}>{block}</p>;
  })}</div>;
}
