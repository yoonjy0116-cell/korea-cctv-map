import Link from "next/link";
import { ExternalLink } from "lucide-react";

type Props = {
  compact?: boolean;
};

export default function PolicyLinks({ compact = false }: Props) {
  return (
    <nav className={compact ? "policyLinks policyLinksCompact" : "policyLinks"} aria-label="사이트 정책">
      <Link href="/privacy">개인정보처리방침</Link>
      <Link href="/terms">이용안내</Link>
      <a href="https://www.data.go.kr/" target="_blank" rel="noreferrer">
        공공데이터포털
        <ExternalLink size={13} aria-hidden="true" />
      </a>
    </nav>
  );
}
