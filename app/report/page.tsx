import dynamic from "next/dynamic";
const Report = dynamic(() => import("../report-beta/ReportBetaClient"), { ssr: false });
export default function Page() { return <Report />; }
