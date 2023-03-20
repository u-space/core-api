import { Notams } from "../../entities/notams";
import { AAANotams } from "../../types";
import { formatDate } from "../../utils/date.utils";

export function convertNotamsToAAANotams(notams: Notams): AAANotams {
  if (
    notams.effective_time_begin === undefined ||
    notams.effective_time_end === undefined
  ) {
    throw new Error("invalid notams");
  }
  return {
    message_id: notams.message_id,
    text: notams.text,
    geography: notams.geography,
    effective_time_begin: new Date(notams.effective_time_begin),
    effective_time_end: new Date(notams.effective_time_end),
  };
}

export function convertAAANotamsToNotams(aaaNotams: AAANotams): Notams {
  const result = new Notams();
  result.message_id = aaaNotams.message_id;
  result.text = aaaNotams.text;
  result.geography = aaaNotams.geography;
  result.effective_time_begin = formatDate(aaaNotams.effective_time_begin);
  result.effective_time_end = formatDate(aaaNotams.effective_time_end);
  return result;
}
