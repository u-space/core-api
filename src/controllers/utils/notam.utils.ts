import { AAANotams } from "../../types";

export function convertAnyToNotam(anyNotam: any): AAANotams {
  return {
    message_id: anyNotam.message_id,
    text: anyNotam.text,
    geography: anyNotam.geography,
    effective_time_begin: anyNotam.effective_time_begin,
    effective_time_end: anyNotam.effective_time_end,
  };
}
