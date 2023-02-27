/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const makeTokenHeaderValue = (token) => {
  return `Bearer ${token}`;
};

function addAuthorization(headers, tokenHeaderValue) {
  headers.append("Authorization", tokenHeaderValue);
  return headers;
}

let callbackResponse = (response: unknown) => {
  console.error(response);
  console.error("¿Fail init?");
};
export function setCallbackResponse(callback) {
  callbackResponse = callback;
}
function postProcessResponse(response) {
  callbackResponse(response);
}

/**
 *
 * @param {*} method GET, POST, PUT, DELETE, etc.
 * @param {*} path ruta HTTP
 * @param {*} token token que se metara en la cabecera 'Bare Token'
 * @param {*} options para sobre escribir las opciones por defecto
 */
export async function doRequest(method, server, path, token, options) {
  try {
    const headers = new Headers();
    headers.append("Content-Type", "application/json");

    if (token) {
      addAuthorization(headers, makeTokenHeaderValue(token));
    }

    const defaultOptions = {
      headers: headers,
      method: method,
      // mode: 'no-cors',
      // credentials: 'include'
    };
    const finalOptions = Object.assign({}, defaultOptions, options);

    const response = await fetch(server + path, finalOptions);
    const json = await response.json();
    postProcessResponse(response);
    if (response.status >= 400) {
      return { error: json };
    } else {
      return json;
    }
  } catch (error) {
    return { error: error };
  }
}

export async function doGet(server, path, token, options) {
  return await doRequest("GET", server, path, token, options);
}

/**
 *
 * @param {*} path ruta HTTP
 * @param {*} token token de autenticacion
 * @param {*} object objecto que se mete en el body del post
 */
export async function doPost(server, path, token, object) {
  const options = { body: JSON.stringify(object) };
  return await doRequest("POST", server, path, token, options);
}
