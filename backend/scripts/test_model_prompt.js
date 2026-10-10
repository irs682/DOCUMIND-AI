const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const run = async () => {
  const prompt = `You are the final answer generator for DOCUMIND-AI.
You receive VERIFIED_EVIDENCE:
Figure ID: Figure 3
Participants:
- Finance Manager
- React Client
- Auth API
- Redis
- PostgreSQL

Interaction Sequence:
1. The Finance Manager enters email and password in the React Client.
2. The React Client sends POST /api/v1/auth/login to the Auth API.
3. The Auth API checks the failure counter in Redis.
4. Redis returns the counter status.
5. The Auth API loads the user and verifies the Argon2id password hash in PostgreSQL.
6. PostgreSQL confirms the credentials and MFA requirement.
7. The Auth API returns an MFA challenge to the React Client.
8. The Finance Manager enters a 6-digit TOTP code.
9. The React Client sends POST /api/v1/auth/mfa/challenge.
10. The Auth API validates the MFA data.
11. The Auth API creates the session and refresh-token family in Redis.
12. The Auth API returns the access and refresh tokens.

Rules:
1. Return only the clean user-facing answer.
2. Never reveal internal reasoning, thought process, or scratchpads.
3. Do not repeat the same interaction twice.
4. Keep entity names exactly as verified.
5. Preserve interaction order.

User Question: According to Figure 3, list all participants in the authentication sequence diagram and describe the order of interactions between them.
Provide your clean user-facing answer:`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3.5-lightning:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 800,
      reasoning: { effort: 'none' },
    }),
  });
  const data = await res.json();
  console.log('Result content:\n', data.choices?.[0]?.message?.content);
};

run();
