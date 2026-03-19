import { UnifiedChat } from "../../components/UnifiedChat";
import { MsalWrapper } from "../../components/MsalWrapper";

export default function DashboardPage() {
  return (
    <MsalWrapper>
      <UnifiedChat />
    </MsalWrapper>
  );
}
