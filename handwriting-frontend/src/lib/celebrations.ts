import { toast } from "sonner";

const MILESTONES: Record<number, string> = {
  1: "🎯 Your roadmap is taking shape!",
  3: "🚀 3 milestones planned — great momentum!",
  5: "🔥 You're on a roll — 5 milestones and counting!",
  10: "✨ Impressive! Your roadmap is coming together.",
  15: "💪 15 milestones — you're building something great!",
  25: "🏆 25 milestones! That's a serious roadmap.",
};

export function celebrateItemCreated(totalItems: number) {
  const milestone = MILESTONES[totalItems];
  if (milestone) {
    toast.success(milestone, { duration: 4000 });
  } else {
    toast.success("Milestone added! You're making progress.", { duration: 2500 });
  }
}

export function celebrateStatusCompleted() {
  toast.success("🎉 Another one done! Great work.", { duration: 3000 });
}

export function celebrateDuplicated() {
  toast.success("Item duplicated — keep building!", { duration: 2000 });
}

export function celebrateDragSaved() {
  toast("Position saved", { duration: 1200 });
}
