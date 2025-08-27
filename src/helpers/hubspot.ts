import { Client } from '@hubspot/api-client';

import { HubSpotEntity } from '../types/hubspot';

type HandleHubSpotErrorParams = {
  hubspotResponse: Record<string, any>;
  objectType: HubSpotEntity;
};

/**
 * Processes errors returned by the HubSpot API and throws structured errors.
 *
 * The HubSpot SDK does not throw errors directly, and generic try/catch methods cannot handle API-specific errors effectively.
 * This function is designed to handle and process API errors, parse the response, and throw structured errors with additional context.
 *
 * @param hubspotResponse - The response object from the HubSpot API. This should include the status code
 * and a `json()` method to parse the response body.
 *
 * @description
 * - Checks if the response indicates success (status codes 2xx).
 * - Handles multi-status responses (status code 477) returned by batch create endpoints, indicating partial failures.
 * - For non-2xx responses, parses and includes error details in the thrown error object.
 *
 * @throws {Error} Throws a structured error for non-2xx responses.
 * - For status code 477, includes details of partial failures.
 * - For all other non-2xx responses, includes the parsed response details.
 *
 * @example
 * // Example usage:
 * try {
 *   await handleHubspotError(response);
 * } catch (error) {
 *   console.error('Error details:', error.details);
 * }
 *
 * @see {@link https://developers.hubspot.com/beta-docs/reference/api/other-resources/error-handling#retries HubSpot API Error Handling Documentation}
 */

export async function handleHubspotError({
  hubspotResponse,
  objectType,
}: HandleHubSpotErrorParams) {
  const status = hubspotResponse.status;

  // Check for 2xx success
  if (status >= 200 && status < 300) {
    return;
  }

  if (status === 429) {
    // TODOM: Rate limit handler
  }

  // Parse the response
  const hubspotApiError = await hubspotResponse.json();

  /**
   * HubSpot for the object APIs' batch create endpoints, if the multi-status response is enabled,
   * the response status will be 477 and it will include partial failures.
   * This means the response will show which records were created and which were not.
   * @see https://developers.hubspot.com/beta-docs/reference/api/other-resources/error-handling#retries
   */

  if (status === 477) {
    const multiStatusError = new Error(
      `HubSpot API request failed with status: 477`,
    );
    multiStatusError.name = 'HubSpotAPIError';
    multiStatusError.stack += `\nDetails: ${JSON.stringify(
      hubspotApiError.errors,
      null,
      2,
    )}`;
    (multiStatusError as any).details = {
      statusCode: status,
      objectType,
      ...hubspotApiError.errors,
    };

    throw multiStatusError;
  }

  // Handle other errors (1xx, 3xx, 4xx, 5xx)
  const generalError = new Error(
    `HubSpot API request failed with status: ${status}`,
  );
  generalError.name = 'HubSpotAPIError';
  generalError.stack += `\nDetails: ${JSON.stringify(
    hubspotApiError,
    null,
    2,
  )}`;
  (generalError as any).details = {
    statusCode: status,
    objectType,
    ...hubspotApiError,
  };

  throw generalError;
}

export default handleHubspotError;
