import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCurrentWeek = () => {
  return useQuery({
    queryKey: ["current-week"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_or_create_current_week");
      if (error) throw error;

      const { data: week, error: weekError } = await supabase
        .from("weeks")
        .select("*")
        .eq("id", data)
        .single();
      if (weekError) throw weekError;
      return week;
    },
  });
};
