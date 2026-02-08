import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050505", // True black base
        primary: "#8b5cf6",    // Violet
        secondary: "#6366f1",  // Indigo
      },
      backgroundImage: {
        // 1. The Main Background: A deep radial glow from the top
        'gradient-main': "radial-gradient(circle at 50% 0%, #1e1b4b 0%, #050505 60%)", 
        
        // 2. The Cards: A diagonal slide from light to dark (Glass effect)
        'gradient-card': "linear-gradient(145deg, rgba(30, 35, 50, 0.6) 0%, rgba(10, 10, 15, 0.4) 100%)",
        
        // 3. The Active Sidebar Tab: A fading glow
        'gradient-sidebar': "linear-gradient(90deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0) 100%)",
        
        // 4. The Buttons: Vivid purple/blue slide
        'gradient-button': "linear-gradient(90deg, #7c3aed 0%, #4f46e5 100%)",
      }
    },
  },
  plugins: [],
};
export default config;