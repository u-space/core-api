/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// var moment = require('moment-timezone');
import moment from "moment-timezone";
const localTimeZone = "America/Montevideo";

export function getLocalTime(timeUTC: any) {
  return moment.tz(timeUTC, localTimeZone).toLocaleString();
}

// expected format: 'YYYY-MM-DDTHH:MM:SSZ'
// example: '2022-01-31T13:02:38Z'
export function isUTCDatetime(datetime: string) {
  if (!datetime.endsWith("Z")) return false;
  return moment(datetime, moment.ISO_8601, true).isValid();
}

export function formatTime(date: Date) {
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

export function formatDateDDMMYYYY(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear());

  return `${day}-${month}-${year}`;
}

export function formatDateLong(
  date: Date,
  includeDayName = false,
  utc = false
): string {
  const monthName = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ][utc ? date.getUTCMonth() : date.getMonth()];
  const dayName = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ][utc ? date.getUTCDay() : date.getDay()];
  return `${includeDayName ? `${dayName} ` : ""}${
    utc ? date.getUTCDate() : date.getDate()
  } de ${monthName} de ${utc ? date.getUTCFullYear() : date.getFullYear()}`;
}

export function addDaysToCurrentDate(days: number): Date {
  const currentDate = new Date(); // Gets today's date
  currentDate.setHours(0, 0, 0, 0);
  currentDate.setDate(currentDate.getDate() + days); // Adds the specified number of days
  return currentDate;
}

export function daysBetween(dateIsoString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Establece la hora de hoy a medianoche para ignorar las horas y minutos actuales

  const givenDate = new Date(dateIsoString);
  givenDate.setHours(0, 0, 0, 0); // Asegura que la hora en la fecha dada también esté a medianoche

  const timeDifference = givenDate.getTime() - today.getTime(); // Calcula la diferencia en milisegundos
  const daysDifference = timeDifference / (1000 * 60 * 60 * 24); // Convierte de milisegundos a días

  return Math.floor(daysDifference); // Devuelve la diferencia en días como un número entero
}
