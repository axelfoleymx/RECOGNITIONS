import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";

/**
 * Returns whether the current user still has to vote for the Rocketer
 * of the current (open) week.
 */
export const usePendingVote = () => {
  const { user } = useAuth();
  const { data: week } = useCurrentWeek();

  const { data: vote, isLoading } = useQuery({
    queryKey: ["my-vote", week?.id],
    enabled: !!week && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("votes")
        .select("*, people:voted_person_id(name)")
        .eq("week_id", week!.id)
        .eq("voter_user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const pending = !!user && week?.status === "open" && !isLoading && !vote;

  return { pending, vote, week };
};
