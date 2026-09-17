# AXIS · Cyber Reality

Scroll-driven 3D centerpiece — iridescent morphing blob with orbiting agents. Editorial light aesthetic.

**Stack:** Vite · React · Three.js · @react-three/fiber · @react-three/drei · Lenis

## Run

```sh
npm install
npm run dev
```

Opens at http://localhost:5173.

## Visa Appointment Assistant

This repo also contains a TurboTax-style wizard that guides a user through
DS-160 completion and Hyderabad-consulate appointment booking. See
[`docs/visa-wizard.md`](docs/visa-wizard.md) for the full write-up, or jump
straight to running it:

```sh
cd server && npm install && npm run dev   # API on :4000
npm install && npm run dev                # frontend on :5173 (in another shell)
```

Then open http://localhost:5173/wizard.
