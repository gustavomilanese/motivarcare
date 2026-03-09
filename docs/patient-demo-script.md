# Patient Demo Script (10-12 min)

## Setup
1. Run `npm install`.
2. Run `npm run dev -w @therapy/patient`.
3. Open `http://localhost:5173`.

## Suggested walkthrough
1. Register/login
- Show register and login tabs.
- Explain that auth is already connected to the intended flow and can be wired to backend auth routes.

2. Intake questionnaire (mandatory)
- Complete all 10 questions.
- Mention clinical objective: matching quality + risk screening.

3. Safety screening
- If answer is `Sometimes` or `Frequently` in safety question, booking gets blocked and emergency resources appear.
- Explain this is intentional compliance and safety behavior.

4. Matching
- Show filtering by specialty/language.
- Open one professional profile and explain compatibility score.
- Click `Reserve` and `Chat` actions.

5. Booking + payment
- Select slot with patient timezone rendering.
- If no available sessions, buy package from Stripe demo checkout simulation.
- Confirm booking and show direct session link + history.

6. Chat
- Send message and show async professional reply.
- Highlight read indicators and thread behavior.

7. Profile
- Show sections: my data, cards, subscription, settings, support, logout.
- Update a setting and save.

## Talking points for stakeholders
- Modular architecture by product areas.
- Ready for Stripe + Daily real integration.
- Safety-first design with risk triage.
- Package with available-session model implemented at UI state level and mapped to backend modules.
