import { useOrg } from '../context/OrgContext'
import { useT } from '../i18n'

// School or Firm wording, from the organisation type ('tutor' = a tutor firm, anything else = a school).
//
//   const { isFirm, org, events, statistics, management } = useOrgTerms()
//   org          "School" or "Firm" in the user's language
//   events       "School Events" or "Firm Events"
//   statistics   "School Statistics" or "Firm Statistics"
//   management   "School Management" or "Firm Management"
//   pick(a, b)   returns a for a school and b for a firm (for text that is not translated by this hook)
// Pages use these instead of writing the word School, so a tutor firm never sees it.
export function useOrgTerms() {
  const { orgType } = useOrg()
  const t = useT()
  const isFirm = orgType === 'tutor'
  return {
    isFirm,
    org: t(isFirm ? 'shell.orgFirm' : 'shell.orgSchool'),
    events: t(isFirm ? 'shell.f_events_firm' : 'shell.f_events'),
    statistics: t(isFirm ? 'shell.f_school_statistics_firm' : 'shell.f_school_statistics'),
    management: t(isFirm ? 'shell.f_school_management_firm' : 'shell.f_school_management'),
    pick: (school, firm) => (isFirm ? firm : school),
  }
}

export default useOrgTerms
