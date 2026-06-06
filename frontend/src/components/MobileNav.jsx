import React from 'react';
import { NavLink } from 'react-router-dom';
import { Search, Library, Home } from 'lucide-react';

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-zinc-900 flex items-center justify-around z-50 px-2 pb-safe">
      <NavLink
        to="/search"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 transition-colors duration-200 ${
            isActive ? 'text-white' : 'text-zinc-500'
          }`
        }
      >
        <Search className="w-6 h-6" />
        <span className="text-[10px] font-medium">Search</span>
      </NavLink>

      <NavLink
        to="/library"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 transition-colors duration-200 ${
            isActive ? 'text-white' : 'text-zinc-500'
          }`
        }
      >
        <Library className="w-6 h-6" />
        <span className="text-[10px] font-medium">Your Library</span>
      </NavLink>
    </nav>
  );
}
