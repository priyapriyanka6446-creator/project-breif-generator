# Project Brief Generator

Project Brief Generator is a Next.js application that helps teams create clean project briefs from scattered notes, chat decisions, and partial requirements. It uses AI to generate structured briefs and detect conflicting information, ensuring clarity and alignment from the start.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Backend/Database**: [Firebase](https://firebase.google.com/) (Firestore, Auth)
- **AI/LLM**: [Genkit](https://firebase.google.com/docs/genkit) (Google GenAI)
- **PDF Processing**: [pdfjs-dist](https://mozilla.github.io/pdf.js/)
- **Deployment**: Next.js Server Actions & Vercel (compatible)

## Features

- **Ingest Source Materials**: Add notes, chat logs, and document snippets.
- **AI-Powered Brief Generation**: Automatically generate a structured project brief including goals, scope, constraints, and risks.
- **Conflict Detection**: Identify and highlight conflicting requirements from the provided sources with evidence.

## Getting Started

To get started, run the development server:

```bash
npm run dev
```

Then, open [http://localhost:9002](http://localhost:9002) in your browser.

- Add your source materials using the "Add Source" button.
- Click "Generate Brief" to have the AI analyze your inputs.
- Review the generated "Brief" and "Conflicts" in the output panel.
