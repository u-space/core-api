import { AircraftType } from "../../entities/aircraft-type";
import { AAAAircratType as AAAAircraftType } from "../../types";
import {
  convertAAAVehicleTypeToVehicleType,
  convertVehicleTypeToAAAVehicleType,
} from "./vehicle-type.utils";

export function convertAircraftTypeToAAAAircraftType(
  aircraftType: AircraftType
): AAAAircraftType {
  const result = {
    id: aircraftType.id,
    manufacturer: aircraftType.manufacturer,
    model: aircraftType.model,
    class: convertVehicleTypeToAAAVehicleType(aircraftType.class),
    mtom: aircraftType.mtom,
    time_autonomy: aircraftType.time_autonomy,
    pilot: aircraftType.pilot,
    band: aircraftType.band,
    color: aircraftType.color,
    lights: aircraftType.lights,
    load_weight: aircraftType.load_weight,
    vhf: aircraftType.vhf,
    visual_front_sensor: aircraftType.visual_front_sensor,
    dimension: aircraftType.dimension,
    energy: aircraftType.energy,
  };
  if (result.id !== undefined) result.id = Number(result.id);
  result.time_autonomy = Number(result.time_autonomy);
  result.load_weight = Number(result.load_weight);
  return result;
}

export function convertAAAAircraftTypeToAircraftType(
  aaaAircraftType: AAAAircraftType
): AircraftType {
  const result = new AircraftType(
    aaaAircraftType.manufacturer,
    aaaAircraftType.model,
    convertAAAVehicleTypeToVehicleType(aaaAircraftType.class),
    aaaAircraftType.mtom,
    aaaAircraftType.time_autonomy,
    aaaAircraftType.pilot,
    aaaAircraftType.band,
    aaaAircraftType.color,
    aaaAircraftType.lights,
    aaaAircraftType.load_weight,
    aaaAircraftType.vhf,
    aaaAircraftType.visual_front_sensor,
    aaaAircraftType.dimension,
    aaaAircraftType.energy
  );
  result.id = aaaAircraftType.id;
  return result;
}
