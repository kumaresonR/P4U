-- Points ledger for social likes (owner reward + reversal on unlike)
ALTER TABLE "points_transactions" ADD COLUMN "social_post_id" TEXT;
ALTER TABLE "points_transactions" ADD COLUMN "social_liker_profile_id" TEXT;

CREATE INDEX "points_transactions_social_like_lookup_idx"
  ON "points_transactions" ("user_id", "social_post_id", "social_liker_profile_id");
