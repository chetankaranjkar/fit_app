# Tailwind CSS 4.1 Setup

This project uses Tailwind CSS 4.1 for styling.

## Installation

Run the following command to install dependencies:

```bash
cd frontend
npm install
```

## Configuration Files

- `tailwind.config.ts` - Tailwind configuration
- `postcss.config.js` - PostCSS configuration
- `src/index.css` - Main CSS file with Tailwind imports

## Usage

All components use Tailwind utility classes instead of custom CSS. The main styling patterns used:

- **Containers**: `bg-white rounded-lg shadow-md p-8`
- **Buttons**: 
  - Primary: `bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded`
  - Danger: `bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded`
  - Secondary: `bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded`
- **Tables**: `w-full border-collapse` with `bg-gray-50` headers
- **Forms**: `w-full p-3 border border-gray-300 rounded` for inputs
- **Modals**: `fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50`

## Development

The Tailwind CSS is automatically processed during development when you run:

```bash
npm run dev
```

## Build

To build for production:

```bash
npm run build
```

Tailwind will automatically purge unused styles in production builds based on the content paths specified in `tailwind.config.ts`.

