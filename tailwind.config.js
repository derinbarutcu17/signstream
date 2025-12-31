/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                zinc: {
                    950: '#09090b',
                },
                red: {
                    500: '#ef4444',
                }
            },
            fontFamily: {
                mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'accent': '0 0 20px 0 rgba(239, 68, 68, 0.2)',
            }
        },
    },
    plugins: [],
}
