# PDF Script Generator

This Next.js application allows you to upload PDF files, extract text content, and generate natural-sounding scripts using Google's Gemini AI. The generated scripts can be edited and customized for each slide.

## Features

- PDF file upload and text extraction
- Automatic script generation using Gemini AI
- Slide-by-slide script editing interface
- Estimated duration calculation for each script
- Modern, responsive UI with Tailwind CSS

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with your Gemini API key:
   ```
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000/script-generator](http://localhost:3000/script-generator) in your browser

## Usage

1. Click the upload area or drag and drop a PDF file
2. Wait for the text extraction and script generation to complete
3. Navigate between slides using the tabs at the top
4. Edit the generated scripts in the text area on the right
5. View the estimated duration for each script

## Technologies Used

- Next.js 14
- TypeScript
- PDF.js for PDF text extraction
- Google Generative AI (Gemini) for script generation
- Radix UI for accessible components
- Tailwind CSS for styling