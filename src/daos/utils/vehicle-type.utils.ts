import { vehicleType } from "../../entities/vehicle-reg";
import { AAAVehicleType } from "../../types";

export function convertAAAVehicleTypeToVehicleType(
  aaaVehicleType: AAAVehicleType
): vehicleType {
  if (aaaVehicleType === AAAVehicleType.FIXEDWING) return vehicleType.FIXEDWING;
  else if (aaaVehicleType === AAAVehicleType.MULTIROTOR)
    return vehicleType.MULTIROTOR;
  else if (aaaVehicleType === AAAVehicleType.OTHER) return vehicleType.OTHER;
  else if (aaaVehicleType === AAAVehicleType.VTOL) return vehicleType.VTOL;
  throw new Error(`Invalid vehicle type (vehicleType=${aaaVehicleType})`);
}

export function convertVehicleTypeToAAAVehicleType(
  vType: vehicleType
): AAAVehicleType {
  if (vType === vehicleType.FIXEDWING) return AAAVehicleType.FIXEDWING;
  else if (vType === vehicleType.MULTIROTOR) return AAAVehicleType.MULTIROTOR;
  else if (vType === vehicleType.OTHER) return AAAVehicleType.OTHER;
  else if (vType === vehicleType.VTOL) return AAAVehicleType.VTOL;
  throw new Error(`Invalid vehicle type (vehicleType=${vehicleType})`);
}
