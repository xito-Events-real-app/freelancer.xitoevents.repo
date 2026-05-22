import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useNavHistory } from "@/contexts/NavHistoryContext";

/**
 * Returns a `goBack()` function that navigates to the previous in-app page
 * if there is real history, otherwise navigates to the provided fallback route.
 *
 * Use this for header back buttons across the app so refreshing or deep-linking
 * still lands the user on a sensible parent route, while normal in-app
 * navigation always returns to the previous screen.
 */
export function useSmartBack(fallback: string = "/") {
  const navigate = useNavigate();
  const { getCount } = useNavHistory();

  return useCallback(() => {
    if (getCount() > 1) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  }, [navigate, getCount, fallback]);
}
