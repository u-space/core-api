import { Point, Polygon } from "geojson";

export interface IResponseRidPosition {
  id?: number;
  operator_username?: string;
  uas_id?: string;
  operation_id?: string;
  ua_type?: number;
  timestamp?: Date;
  operational_status?: number;
  position?: Point;
  geodetic_altitude?: number;
  horizontal_accuracy?: number;
  vertical_accuracy?: number;
  speed?: number;
  direction?: number;
  vertical_speed?: number;
  operator_location?: Point;
  operating_area_radius?: number;
  operating_area_polygon?: Polygon;
  operating_area_floor?: number;
  operating_area_ceiling?: number;
  operating_area_start_time?: Date;
  operating_area_end_time?: Date;
}
