/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import mjml from "mjml";
import { Document } from "../entities/document";
import { Operation } from "../entities/operation";
import { User } from "../entities/user";
import { VehicleAuthorizeStatus, VehicleReg } from "../entities/vehicle-reg";
import {
  COMPANY_NAME,
  OPERATION_PAYMENT_THROW_THE_APP,
  SUPPORT_EMAIL,
  frontEndAssets,
  frontEndUrl,
} from "./config.utils";
import { getLocalTime } from "./date.utils";
import GeneralUtils from "./general.utils";

export function mjml2htmlCompleto(str: any, opt: { validationLevel: string }) {
  const optionsPreset: any = { ...opt };
  return mjml(str, optionsPreset);
}

/////////// LINK FUNCTIONS todo:llevar a un archivo aparte de links

export const buildConfirmationLink = (
  username: any,
  token: any,
  frontEndEndpoint: any
) => {
  return `${frontEndEndpoint}/verify/${username}?token=${token}`;
};

// export const buildRecoverLink = (
//   username: any,
//   token: any,
//   frontEndEndpoint: any
// ) => {
//   return `${frontEndEndpoint}/recover/${username}?token=${token}`;
// };

export const buildMagicSignupLink = (username: any, token: any) =>
  `${frontEndUrl}password-reset/${username}?token=${token}`;

export const buildOperationLink = (operation: any) => {
  return `${frontEndUrl}map?operation=${operation.gufi}`;
};
export const getPublicOperationLink = (operation: any) => {
  return `${frontEndUrl}public/operation/${operation.gufi}`;
};
export const vehicleUrl = (uvin: any) => {
  return `${frontEndUrl}vehicles/${uvin}`;
};
export const getUrlRfv = (rfvid: any) => {
  return frontEndUrl + "rfv/" + rfvid;
};
export const getUrlUvr = (id: any) => {
  return frontEndUrl + "uvr/" + id;
};

// export const LOGO_LINK = `${backendUrl}logo.png`;
export const LOGO_LINK = `${frontEndUrl}${frontEndAssets}platform.png`;
export const ORGANIZATION_LOGO_LINK = `${frontEndUrl}${frontEndAssets}organization.png`;
// https://localhost:8228/platform.png
////// GENERIC UTILS to use on all emails

/**
 *
 * @returns Return open email structure for mjml. Keep opened tags <mjml><mj-body>
 */

function initMailAndPutHeader() {
  return `<mjml>
  <mj-head>
    <mj-font name="Raleway" href="https://fonts.googleapis.com/css?family=Maven%20Pro" />
  </mj-head>
  <mj-body background-color="#ffffff">

    <!-- Header -->
    <mj-section background-color="#1e3a8a">
      <mj-column>
        <mj-text font-style="bold" font-weight="900" width="360px" font-size="20px" color="#ffffff" align="center">
          <img style="max-height:100px" src="${LOGO_LINK}" alt="" />
        </mj-text>
        <mj-text font-style="bold" font-weight="900" width="360px" font-size="20px" color="#ffffff" align="center">
            Gestión de Operaciones con Drones
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#edecfc">
    <mj-column background-color="#ffffff" width="90%">
`;
}

/**
 *
 * @returns Return open email structure for mjml. Keep opened tags <mjml><mj-body>
 */

function endMailAndPutFooter(supportEmail: string, companyName: string) {
  return `
  ${paragraph(`Si tienes cualquier consulta, escríbenos a ${supportEmail}`)}
  ${paragraph("Un saludo,", "10px 10px 0px 10px")}
  ${paragraph(`Equipo de ${companyName}.`, "0px 10px 10px 10px")}
    </mj-column>
  </mj-section>
  <!-- Footer -->
  <mj-section background-color="#1e3a8a">
    <mj-column>
      <mj-text  font-size="14px" color="#ffffff" align="right" padding-right="20px">
        <a href="https://cielum.eu"><img style="max-width:100px" src="${ORGANIZATION_LOGO_LINK}" alt="Organization" /> </a>
      </mj-text>
    </mj-column>
  </mj-section>
</mj-body>
</mjml>
`;
}

function title(text: any) {
  return `
  <mj-text font-style="bold" font-size="20px" color="#141414" align="center" padding="10px">
${text}
</mj-text>`;

  // return `
  // <mj-text font-family="\"Maven Pro\", Helvetica, Arial, Lucida, sans-serif" font-style="bold" font-size="24px" color="#141414" align="center" padding="10px">
  // ${text}
  // </mj-text>`
}

function paragraph(
  text: any,
  padding = "10px",
  fontSize = "18px",
  italic = false,
  color = "#141414"
) {
  // return `<mj-text font-family="\"Maven Pro\", Helvetica, Arial, Lucida, sans-serif"  font-size="18px" color="#141414" align="left" padding="10px">
  // ${text}
  // </mj-text>`
  return `<mj-text
	${italic ? 'font-style= "italic"' : ""}
	font-size=${'"' + `${fontSize}` + '"'} color=${color} align="left" padding=${
    '"' + `${padding}` + '"'
  }>
  ${text}
  </mj-text>`;
}

/**
 * Generate an email from a mjml body specification. Put the body on a mjml column and put header and footer
 * @param body
 * @returns
 */
function generateBaseMail(body: any) {
  const initMail = initMailAndPutHeader();
  const supportEmail: any = SUPPORT_EMAIL;
  const companyName: any = COMPANY_NAME;
  const endMail = endMailAndPutFooter(supportEmail, companyName);
  let email;
  try {
    email = mjml2htmlCompleto(`${initMail}${body}${endMail}`, {
      validationLevel: "soft",
    });
    email = email.html;
    // console.log(`*******************************************`)
    // console.log(email)
    // console.log(`*******************************************`)
  } catch (error) {
    email = `<b>${error}</b>`;
  }
  return email;
}

//// ENTITY EMAILS

function bodyOperationVehiclesBodyMail(operation: any) {
  let vehiclesStr = "";
  if (operation.uas_registrations && operation.uas_registrations.length > 0) {
    vehiclesStr = operation.uas_registrations.reduce(
      (prev: any, vehicle: any) => {
        return prev.concat(`${bodyVehicleMail(vehicle)}`);
      },
      ""
    );
  }
  return vehiclesStr;
}

function bodyVehicleMail(vehicle: VehicleReg) {
  const labelsAndFields = [];

  labelsAndFields.push(["Identificador", `${vehicle.uvin}`]);
  labelsAndFields.push(["Nombre", `${vehicle.vehicleName}`]);
  labelsAndFields.push(["Modelo", `${vehicle.model}`]);
  //TODO: map field name to human readable name
  if (vehicle.extra_fields) {
    Object.keys(vehicle.extra_fields).forEach((key) => {
      if (key !== "id" && key !== "vehicleId") {
        labelsAndFields.push([`${key}`, `${vehicle.extra_fields[key]}`]);
      }
    });
  }
  const vehicleBody = `
        <mj-text font-style="bold" font-size="20px" color="#141414" align="center" padding="10px">
          Información sobre aeronave
        </mj-text>
        <mj-table border="solid 1px" padding="10px" mj-class="celdita">
        ${labelsAndFields
          .map(([label, field]) => {
            if (field && field != "null") {
              return `<tr>
            <td style="padding: 0 0px 0 5px;border:solid 1px;width:40%">${label}</td>
            <td style="padding: 0 0px 0 5px;border:solid 1px">${field}</td>
          </tr>`;
            } else {
              return "";
            }
          })
          .join("")}
        </mj-table>
    `;
  return vehicleBody;
}

function bodyUserMail(user: any) {
  const labelsAndFields = [];
  labelsAndFields.push(["Nombre de usuario", `${user.username}`]);
  labelsAndFields.push(["Nombre", `${user.firstName}`]);
  labelsAndFields.push(["Apellido", `${user.lastName}`]);
  labelsAndFields.push(["Email", `${user.email}`]);
  //labelsAndFields.push(['Estado', `${user.status.status}`]);
  const userBody = `

     <mj-table border="solid 1px" padding="10px" mj-class="celdita">
     ${labelsAndFields
       .map(([label, field]) => {
         return `<tr>
         <td style="padding: 0 0px 0 5px;border:solid 1px;width:40%">${label}</td>
         <td style="padding: 0 0px 0 5px;border:solid 1px">${field}</td>
       </tr>`;
       })
       .join("")}
     </mj-table>`;
  return userBody;
}

function bodyOperationMail(operation: Operation) {
  const labelsAndFields = [];
  labelsAndFields.push([
    "Link privado",
    `<a href="${buildOperationLink(operation)}">${buildOperationLink(
      operation
    )}</a>`,
  ]);
  labelsAndFields.push(["Identificador", `${operation.gufi}`]);
  labelsAndFields.push(["Estado", `${operation.state}`]);
  labelsAndFields.push(["Contacto", `${operation.contact}`]);
  labelsAndFields.push(["Teléfono ", `${operation.contact_phone}`]);
  let effectiveTimeBegin = "<NOT DEFINED>";
  try {
    effectiveTimeBegin = getLocalTime(
      operation.operation_volumes[0].effective_time_begin
    );
    // eslint-disable-next-line no-empty
  } catch (error) {}
  labelsAndFields.push(["Comienzo ", effectiveTimeBegin]);
  let effectiveTimeEnd = "<NOT DEFINED>";
  try {
    effectiveTimeEnd = getLocalTime(
      operation.operation_volumes[operation.operation_volumes.length - 1]
        .effective_time_end
    );
    // eslint-disable-next-line no-empty
  } catch (error) {}
  labelsAndFields.push(["Fin", effectiveTimeEnd]);
  let maxAltitude = "<NOT DEFINED>";
  try {
    maxAltitude = `${
      operation.operation_volumes.reduce(function (prev, current) {
        return prev.max_altitude > current.max_altitude ? prev : current;
      }).max_altitude
    }`;
    // eslint-disable-next-line no-empty
  } catch (error) {}
  labelsAndFields.push(["Altitud máxima (m) ", maxAltitude]);
  labelsAndFields.push([
    "Comentarios de la aeronave ",
    `${operation.aircraft_comments}`,
  ]);
  labelsAndFields.push([
    "Comentarios del vuelo ",
    `${operation.flight_comments}`,
  ]);
  // labelsAndFields.push(['Polígono', `${JSON.stringify(operation.operation_volumes)}`]);
  const operationBody = `
      ${title(`Información sobre la operación: <i>${operation.name}</i>`)}
      ${
        OPERATION_PAYMENT_THROW_THE_APP
          ? paragraph(
              operation.state === "PROPOSED"
                ? "Nos contactaremos con usted para proceder al pago de la operación"
                : operation.state === "PENDING"
                ? 'Puede realizar el pago de la operación en el enlace que aparece bajo "comentarios del vuelo". Una vez hecho nos contactaremos con usted'
                : "Pago realizado correctamente"
            )
          : ""
      }
      <mj-table border="solid 1px" padding="10px" mj-class="celdita">
      ${labelsAndFields
        .map(([label, field]) => {
          return `<tr>
          <td style="padding: 0 0px 0 5px;border:solid 1px;width:40%">${label}</td>
          <td style="padding: 0 0px 0 5px;border:solid 1px">${
            field == "null" ? "" : field
          }</td>
        </tr>`;
        })
        .join("")}
      </mj-table>
      ${title("Información sobre operador")}
      ${
        operation.owner && operation.owner.username
          ? bodyUserMail(operation.owner)
          : operation.owner
          ? paragraph("Nombre de usuario: " + operation.owner)
          : ""
      }
      ${
        operation.uas_registrations
          ? bodyOperationVehiclesBodyMail(operation)
          : ""
      }
    `;
  return operationBody;
}

////////// SPECIFIC EMAILS

// RESET PASSWORD
export function buildResetPasswordText(username: string, link: string) {
  return `
    Hola ${username},
    Para poder cambiar la contraseña haz click en el siguiente link, el cual es válido por 15 minutos.
    Deberá establecer una nueva contraseña.

    ${link}
    `;
}
export function buildResetPasswordHtml(username: string, link: string) {
  const mjmlBody = `
    ${title(`Hola ${username}`)}
    ${paragraph(
      "Para poder cambiar la contraseña haz click en el siguiente link, el cual es válido por 15 minutos."
    )}
    ${paragraph("Deberá establecer una nueva contraseña.")}
    ${paragraph(`<a href="${link}">${link}</a>`)}
    `;
  const email = generateBaseMail(mjmlBody);
  return email;
}

// SET YOUR PASSWORD, MAGIC SIGNUP
export function buildMagicSignUpText(username: any, link: any) {
  return `
    Hola ${username},
    Para poder volver a iniciar sesión en el sistema, haz click en el siguiente link, el cual es válido por 1 hora.
    Deberá establecer una nueva contraseña.

    ${link}
    `;
}
export function buildMagicSignUpHtml(username: any, link: any) {
  const mjmlBody = `
    ${title(`Hola ${username}`)}
    ${paragraph(
      "Para poder volver a iniciar sesión en el sistema, haz click en el siguiente link, el cual es válido por 1 hora."
    )}
    ${paragraph("Deberá establecer una nueva contraseña.")}
    ${paragraph(`<a href="${link}">${link}</a>`)}
    `;
  const email = generateBaseMail(mjmlBody);
  console.log(email);
  return email;
}

///// NEW VEHICLE
export function generateNewVehicleMailHTML(vehicle: VehicleReg) {
  const mjmlBody = `
  ${title("Se ha registrado una nueva aeronave")}
  ${paragraph(`El usuario <b><i>${
    vehicle.owner!.username
  }</i></b>, ha registrado una aeronave con identificador ${vehicle.uvin},
  para más detalles y autorizar la aeronave haga click o copie el siguiente enlace <a href="${vehicleUrl(
    vehicle.uvin
  )}">${vehicleUrl(vehicle.uvin)}</a>`)}
  <mj-button color="white" href="${vehicleUrl(vehicle.uvin)}">
    Ver aeronave
  </mj-button>
  `;
  const email = generateBaseMail(mjmlBody);
  return email;
}

export function generateUpdateVehicleMailHTML(vehicle: VehicleReg) {
  const mjmlBody = `
  ${title("Se ha actualizado una aeronave")}
  ${paragraph(`El usuario <b><i>${
    vehicle.owner!.username
  }</i></b>, ha actualizado la aeronave con identificador ${vehicle.uvin},
  para más detalles haga click o copie el siguiente enlace <a href="${vehicleUrl(
    vehicle.uvin
  )}">${vehicleUrl(vehicle.uvin)}</a>`)}
  <mj-button color="white" href="${vehicleUrl(vehicle.uvin)}">
    Ver aeronave
  </mj-button>
  `;
  const email = generateBaseMail(mjmlBody);
  return email;
}

export function generateNewVehicleMailText(vehicle: any) {
  return `
    Se ha registrado una nueva aeronave.
    El usuario ${
      vehicle.owner.username
    }, ha registrado una aeronave con identificador ${vehicle.uvin},
    para más detalles y autorizar la aeronave utilice el siguiente enlace ${vehicleUrl(
      vehicle.uvin
    )}
     `;
}

export function generateUpdateVehicleMailText(vehicle: any) {
  return `
    Se ha actualizado la informacion de una aeronave.
    El usuario ${
      vehicle.owner.username
    }, ha actualizado la aeronave con identificador ${vehicle.uvin},
    para más detalles utilice el siguiente enlace ${vehicleUrl(vehicle.uvin)}
     `;
}

///////// AUTHORIZE VEHICLE
export function generateAuthorizeVehicleMailHTML(vehicle: VehicleReg) {
  const mjmlBody = `
  ${paragraph(
    `La aeronave <b><i>${vehicle.vehicleName}</i></b> ${
      vehicle.authorized == VehicleAuthorizeStatus.AUTHORIZED
        ? "ha sido"
        : "no ha sido"
    } autorizado.`
  )}
  ${paragraph(
    `Para más detalles haga click <a href="${vehicleUrl(
      vehicle.uvin
    )}">aquí</a>`
  )}
  `;
  const email = generateBaseMail(mjmlBody);
  return email;
}

export function generateAuthorizeVehicleMailText(vehicle: VehicleReg) {
  return `
    La aeronave ${vehicle.vehicleName} ${
    vehicle.authorized == VehicleAuthorizeStatus.AUTHORIZED
      ? "ha sido"
      : "no ha sido"
  } autorizada.
    Para más detalles utilice el siguiente enlace ${vehicleUrl(vehicle.uvin)}
     `;
}

// NEW OPERATION

export function operationMailHtml(operation: Operation) {
  console.log(`Build operation email for ${operation.gufi}`);
  const body = bodyOperationMail(operation);
  const email = generateBaseMail(body);
  return email;
}

/////   PENDING OPERATION
export const makeBodyForPendingOpeartionMailText = (
  bodyMail: any,
  operation: any,
  rfvMsg: any,
  rfvs: any
) => {
  return `${bodyMail}

  Información sobre la operación: ${operation.name}:
  Identificador ${operation.gufi}
  Conteacto ${operation.contact}
  Comienzo ${operation.operation_volumes[0].effective_time_begin}
  Fin ${
    operation.operation_volumes[operation.operation_volumes.length - 1]
      .effective_time_end
  }
  Altitud máxima (in meters) ${
    operation.operation_volumes.reduce(function (prev: any, current: any) {
      return prev.max_altitude > current.max_altitude ? prev : current;
    }).max_altitude
  }}
  Comentarios de aeronave ${operation.aircraft_comments}
  Comentarios del vuelo ${operation.flight_comments}

  La misión está a la espera de ser aprobada porque vuela en las siguientes zonas reestringidas:
  ${rfvs
    .map((rfv: any) => {
      return `${rfv.comments} más inforamción en ${getUrlRfv(rfv.id)}`;
    })
    .join("\n")}
`;
};

export const makeBodyForPendingOperationMailHtml = (
  introductionPendingMessage: any,
  operation: any,
  rfvMsg: any,
  rfvs: any
) => {
  const mjmlBody = `
  ${title(introductionPendingMessage)}
  ${paragraph(
    "La misión está a la espera de ser aprobada porque vuela en las siguientes zonas reestringidas:"
  )}
  ${rfvs
    .map((rfv: any) => {
      return paragraph(
        `<a href="${getUrlRfv(rfv.id)}">${rfv.comments}</a> <small>(${getUrlRfv(
          rfv.id
        )})</small>`
      );
    })
    .join("")}
  ${bodyOperationMail(operation)}
  `;
  return generateBaseMail(mjmlBody);
};

export function buildGenericActionMail(action: any, operation: any) {
  const mjmlBody = `
    ${title(`Se ejecutó la acción ${action.name}`)}
    ${paragraph(
      `Se ejecutó la acción ${action.name} sobre la operación ${operation.name} con gufi ${operation.gufi}`
    )}
    `;
  const email = generateBaseMail(mjmlBody);
  return email;
}

export function buildNewObservationMail(document: Document) {
  const mjmlBody = `
	  ${title("Nueva observación")}
	  ${paragraph("Se ha creado una nueva observación:")}
	  ${paragraph(document.observations, "10px", "18px", true, "red")}
	  ${paragraph(
      `Para ver mas información ingrese a ${GeneralUtils.getDownloadFileUrl(
        document.getFileName()
      )}`,
      "10px",
      "18px"
    )}	`;
  const email = generateBaseMail(mjmlBody);
  return email;
}

export function buildNewUserMail(user: User) {
  const link = frontEndUrl + "/users?id=" + user.username;
  const mjmlBody = `
    ${title("Nuevo usuario")}
    ${paragraph("Se ha creado un nuevo usuario:")}
    ${paragraph(user.email, "10px", "18px", true, "red")}
    ${paragraph("Para ver mas información ingrese a: ", "10px", "18px")}
    ${paragraph(
      `<a href="${link}">Ver ${user.username}</a>`,
      "10px",
      "18px",
      true,
      "red"
    )}

  `;
  const email = generateBaseMail(mjmlBody);
  return email;
}

export function buildNewDocumentMail(username: string, document: Document) {
  const mjmlBody = `
		${title("Nuevo documento")}
		${paragraph(`El usuario ${username} ha creado un nuevo documento:`)}
		${paragraph(`${document.name} || ${document.tag}`, "10px", "18px", true, "red")}
		${paragraph("Para ver mas información ingrese a: ", "10px", "18px")}
		${paragraph(
      `<a href="${GeneralUtils.getDownloadFileUrl(
        document.getFileName()
      )}">Ver ${document.name}</a>`,
      "10px",
      "18px",
      true,
      "red"
    )}

	`;
  const email = generateBaseMail(mjmlBody);
  return email;
}

// This function takes a list of lat,long coordinates and return a list of DMS coordinates
export function getDMS(coordinates: any) {
  return coordinates.map((coord: any) => {
    const lat = coord[1];
    const long = coord[0];
    const latDMS = getDMSFromDecimal(lat);
    const longDMS = getDMSFromDecimal(long);
    return `${latDMS} ${longDMS}`;
  });
}

export function getDMSFromDecimal(decimal: any) {
  const degrees = Math.floor(decimal);
  const minutesNotTruncated = (decimal - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60);
  return `${degrees}°${minutes}'${seconds}"`;
}

export function buildConfirmationTextMail(
  username: any,
  link: any,
  appName: string
) {
  return `
    Hello ${username},
    Thank you for registering in ${appName}!
    To finish the user registration process, please click in the following link.

    ${link}
    `;
}

export function buildConfirmationHtmlMail(
  username: any,
  link: any,
  appName: string
) {
  const mjmlBody = `
    ${title(`Bienvenido a bordo ${username}!`)}
    ${paragraph(`Gracias por registrarte en ${appName}!`, "10px 10px 0px 10px")}
    ${paragraph(
      "La forma más rápida de gestionar tus operaciones con drones.",
      "0px 10px 10px 10px"
    )}
    ${paragraph(
      "Para finalizar el proceso de registro, haga click o copie el siguiente link en tu navegador."
    )}
    ${paragraph(`<a href="${link}">${link}</a>`)}
    `;
  const email = generateBaseMail(mjmlBody);
  // console.log(email);
  return email;
}

// export function buildRecoverTextMail(
//   username: any,
//   link: any,
//   appName: string
// ) {
//   return `
//     Hello ${username},
//     We have received your request to change your password in${appName}!
//     To make the change follow the following link

//     ${link}
//     `;
// }

// export function buildRecoverHtmlMail(
//   username: any,
//   link: any,
//   appName: string
// ) {
//   const mjmlBody = `
//     ${title(`Hola ${username}!`)}
//     ${paragraph(
//       `Hemos recibido tu pedido de cambio de contraseña en  ${appName}!`,
//       "10px 10px 0px 10px"
//     )}
//     ${paragraph("Para realizar el cambio sigue el siguiente link:")}
//     ${paragraph(`<a href="${link}">${link}</a>`)}
//     `;
//   const email = generateBaseMail(mjmlBody);
//   // console.log(email);
//   return email;
// }

export function buildExpiredDocumentationTextMail(
  username: any,
  document: Document,
  appName: string
) {
  return `
    Hello ${username},
    Ha vencido el documento:
    ${JSON.stringify(document, null, 2)}
    `;
}

export function buildExpiredDocumentationHtmlMail(
  username: any,
  document: Document,
  appName: string
) {
  const mjmlBody = `
    ${title(`Hola ${username}!`)}
    ${paragraph("Ha vencido el documento:")}
    ${paragraph(`<pre>${JSON.stringify(document, null, 2)}</pre>`)}
    `;
  const email = generateBaseMail(mjmlBody);
  // console.log(email);
  return email;
}

export function buildNextToExpireDocumentTextMail(
  username: any,
  document: Document,
  day: number,
  appName: string
) {
  return `
    Hello ${username},
    El documento vence en menos de ${day}
    ${JSON.stringify(document, null, 2)}
    `;
}

export function buildNextToExpireDocumentHtmlMail(
  username: any,
  document: Document,
  day: number,
  appName: string
) {
  const mjmlBody = `
    ${title(`Hola ${username}!`)}
    ${paragraph(`Tienes un documento que vence en menos de ${day}:`)}
    ${paragraph(`<pre>${JSON.stringify(document, null, 2)}</pre>`)}
    `;
  const email = generateBaseMail(mjmlBody);
  // console.log(email);
  return email;
}
