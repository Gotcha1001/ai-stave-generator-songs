"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden bg-gradient-to-b from-background to-muted/40">
      {/* Animated Background Glow */}
      <motion.div
        className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/30 via-purple-500/20 to-indigo-500/30 blur-3xl"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      {/* Hero Section */}
      <motion.h1
        className="text-5xl md:text-6xl font-bold tracking-tight max-w-4xl"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Generate Beautiful Sheet Music
        <span className="block text-primary mt-2">With AI</span>
      </motion.h1>

      <motion.p
        className="mt-6 text-muted-foreground text-lg max-w-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        Create piano melodies instantly. Choose key, difficulty, and style.
        Export clean printable sheet music in seconds.
      </motion.p>

      <motion.div
        className="mt-10 flex gap-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <Link href="/studio">
          <Button size="lg" className="text-lg px-8">
            Enter Studio
          </Button>
        </Link>

        <Link href="/sign-up">
          <Button variant="outline" size="lg">
            Get Started
          </Button>
        </Link>
      </motion.div>

      {/* Features Section */}
      <motion.div
        className="grid md:grid-cols-3 gap-8 mt-24 max-w-6xl w-full"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.2 },
          },
        }}
      >
        {[
          {
            title: "AI Generated",
            description:
              "Create structured melodies using intelligent music logic.",
          },
          {
            title: "Printable PDF",
            description: "Export clean professional sheet music instantly.",
          },
          {
            title: "Custom Difficulty",
            description: "Beginner to advanced — fully controlled generation.",
          },
        ].map((feature, index) => (
          <motion.div
            key={index}
            className="p-6 rounded-2xl border bg-card shadow-sm"
            variants={{
              hidden: { opacity: 0, y: 40 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
            <p className="text-muted-foreground">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Footer CTA */}
      <motion.div
        className="mt-24 mb-16"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <h2 className="text-3xl font-bold mb-4">Start Composing Today</h2>
        <Link href="/studio">
          <Button size="lg">Open Studio →</Button>
        </Link>
      </motion.div>
    </main>
  );
}
