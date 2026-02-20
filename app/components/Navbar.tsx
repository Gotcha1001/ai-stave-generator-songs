"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { useUserContext } from "../context/UserContext";
import { ThemeToggle } from "./ThemeToggle";

export default function Navbar() {
  const user = useUserContext();

  return (
    <motion.nav
      className="flex items-center justify-between p-4 border-b bg-background"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Link href="/" className="text-xl font-bold">
        🎼 AI Sheet Music
      </Link>

      <div className="flex items-center gap-4">
        <SignedOut>
          <Link href="/sign-in">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button>Sign Up</Button>
          </Link>
        </SignedOut>

        <SignedIn>
          <Link href="/studio">
            <Button variant="ghost">Dashboard</Button>
          </Link>

          {user?.role === "admin" && (
            <Link href="/admin">
              <Button variant="ghost">Admin</Button>
            </Link>
          )}

          <ThemeToggle />
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </motion.nav>
  );
}
