import type { MatchingPageProps } from "../../matching/types";
import { PatientMatchingPage } from "../../matching/pages/PatientMatchingPage";

export function MatchingPage(props: MatchingPageProps) {
  return <PatientMatchingPage {...props} />;
}
