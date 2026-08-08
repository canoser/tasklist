import Hero from "@/features/hero/Hero";
import ProblemStatement from "@/features/problem-statement/ProblemStatement";
import Methodology from "@/features/methodology/Methodology";
import Pricing from "@/features/pricing/Pricing";
import FinalCta from "@/features/cta/FinalCta";

export default function Home() {
  return (
    <>
      <Hero />
      <ProblemStatement />
      <Methodology />
      <Pricing />
      <FinalCta />
    </>
  );
}
