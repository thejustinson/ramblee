"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ProfileFeedEvent } from "@/utils/feed-events";
import ProfileActivityLine from "./ProfileActivityLine";
import ProfileFeedGameCard from "./ProfileFeedGameCard";

const listVariants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2 },
  },
};

export default function ProfileFeed({
  events,
  isOwnProfile,
  displayName,
  ownerProfileHandle,
}: {
  events?: ProfileFeedEvent[];
  isOwnProfile: boolean;
  displayName: string;
  /** When set (owner viewing own profile), wallet CTA links to edit page. */
  ownerProfileHandle?: string;
}) {
  if (!events || events.length === 0) {
    if (isOwnProfile) {
      return (
        <div className="py-16 text-center space-y-6">
          <p className="font-sans text-brand-muted">No games yet.</p>
          <Link
            href="/join"
            className="inline-block font-sans text-sm font-semibold px-5 py-2.5 bg-brand-lime text-brand-black rounded-[2px] hover:brightness-110 transition-[filter]"
          >
            Find a Room
          </Link>
        </div>
      );
    }
    return (
      <div className="py-16 text-center">
        <p className="font-sans text-brand-muted">
          {displayName} hasn&apos;t played any games yet.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-6"
      variants={listVariants}
      initial="hidden"
      animate="show"
    >
      {events.map((event) => (
        <motion.article key={event.id} variants={itemVariants} className="flex flex-col gap-3">
          <ProfileActivityLine displayName={displayName} event={event} />
          <ProfileFeedGameCard
            event={event}
            isOwnProfile={isOwnProfile}
            ownerProfileHandle={ownerProfileHandle}
          />
        </motion.article>
      ))}
    </motion.div>
  );
}
