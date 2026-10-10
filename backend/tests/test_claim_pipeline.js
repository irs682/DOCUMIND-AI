const { runClaimVerificationPipeline } = require('../services/claimVerificationService');

const draft = `
1. Staff invitation token is valid for 48 hours.
2. Password history disallows reuse of the last 4 passwords.
3. MFA is mandatory for System Administrator, Owner, Finance Manager, and Branch Manager.
4. Exactly 10 recovery codes are issued.
5. Access tokens expire in 15 minutes.
`;

const source = `
Section 3.1.3 BR-AUTH-10: Invitation tokens are single-use, expire 72 hours after issue.
Section 3.1.6 BR-AUTH-26: The previous 5 passwords are unusable.
Section 3.1.4 BR-AUTH-14: MFA shall be permanently enforced for System Administrator, Owner, CEO, and Finance Manager.
Section 3.1.4 BR-AUTH-16: Exactly 10 recovery codes exist per user.
Section 3.1.1: Access tokens expire in 15 minutes.
`;

const res = runClaimVerificationPipeline({ answer: draft, sourceText: source });
console.log('=== VERIFIED ANSWER ===');
console.log(res.verifiedAnswer);
console.log('=== SUMMARY ===');
console.log(JSON.stringify(res.summary, null, 2));
console.log('=== PASSED? ===', res.passed);
