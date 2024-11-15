import { ActionDefinition, PayloadValidationError } from '@segment/actions-core'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'
import { CustomEvent, User } from './types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Custom Events',
  description: 'Send user analytics events to Attentive',
  defaultSubscription: 'type = "track"',
  fields: {
    type: {
      label: 'Type',
      description:
        'The type of event. This name is case sensitive. "Order shipped" and "Order Shipped" would be considered different event types.',
      type: 'string',
      required: true,
      default: {
        '@path': '$.event'
      }
    },
    userIdentifiers: {
      label: 'User Identifiers',
      description:
        'At least one identifier is required. Custom identifiers can be added as additional key:value pairs.',
      type: 'object',
      required: true,
      additionalProperties: true,
      defaultObjectUI: 'keyvalue:only',
      properties: {
        phone: {
          label: 'Phone',
          description: "The user's phone number in E.164 format.",
          type: 'string',
          required: false,
          default: {
            '@if': {
              exists: { '@path': '$.properties.phone' },
              then: { '@path': '$.properties.phone' },
              else: { '@path': '$.context.traits.phone' }
            }
          }
        },
        email: {
          label: 'Email',
          description: "The user's email address.",
          type: 'email',
          required: false,
          default: {
            '@if': {
              exists: { '@path': '$.properties.email' },
              then: { '@path': '$.properties.email' },
              else: { '@path': '$.context.traits.email' }
            }
          }
        },
        clientUserId: {
          label: 'Client User ID',
          description: 'A primary ID for a user.',
          type: 'uuid',
          required: false
        }
      },
      default: {
        phone: {
          '@if': {
            exists: { '@path': '$.properties.phone' },
            then: { '@path': '$.properties.phone' },
            else: { '@path': '$.context.traits.phone' }
          }
        },
        email: {
          '@if': {
            exists: { '@path': '$.properties.email' },
            then: { '@path': '$.properties.email' },
            else: { '@path': '$.context.traits.email' }
          }
        },
        clientUserId: { '@path': '$.userId' }
      }
    },
    properties: {
      label: 'Properties',
      description: 'Metadata to associate with the event.',
      type: 'object',
      required: false,
      default: {
        '@path': '$.properties'
      }
    },
    externalEventId: {
      label: 'External Event Id',
      description: 'A unique identifier representing this specific event. A UUID is recommended.',
      type: 'string',
      required: false,
      default: {
        '@path': '$.messageId'
      }
    },
    occurredAt: {
      label: 'Occurred At',
      description: 'Timestamp for the event, ISO 8601 format.',
      type: 'string',
      required: false,
      default: {
        '@path': '$.timestamp'
      }
    }
  },
  perform: (request, { payload }) => {
    const {
      externalEventId,
      type,
      properties,
      occurredAt,
      userIdentifiers: { phone, email, clientUserId, ...customIdentifiers }
    } = payload

    if (!email && !phone && !clientUserId && Object.keys(customIdentifiers).length === 0) {
      throw new PayloadValidationError('At least one user identifier is required.')
    }

    const json: CustomEvent = {
      type,
      properties,
      externalEventId,
      occurredAt,
      user: {
        phone,
        email,
        ...(clientUserId || customIdentifiers
          ? {
              externalIdentifiers: {
                ...(clientUserId ? { clientUserId } : {}),
                ...(customIdentifiers ? { customIdentifiers } : {})
              }
            }
          : {})
      } as User
    }

    return request('https://api.attentivemobile.com/v1/events/custom', {
      method: 'post',
      json
    })
  }
}

export default action