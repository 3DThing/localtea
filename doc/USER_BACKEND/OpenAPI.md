# LocalTea
**Version:** 0.1.0

## Endpoints

### `/api/v1/user/change-address`

#### POST
**Summary:** Change Address

**Request Body:**

- Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/ChangeAddress"
}
```

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "title": "Response Change Address Api V1 User Change Address Post"
}
```

- **422**: Validation Error
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/HTTPValidationError"
}
```

### `/api/v1/user/change-birthdate`

#### POST
**Summary:** Change Birthdate

**Request Body:**

- Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/ChangeBirthdate"
}
```

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "title": "Response Change Birthdate Api V1 User Change Birthdate Post"
}
```

- **422**: Validation Error
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/HTTPValidationError"
}
```

### `/api/v1/user/change-email`

#### POST
**Summary:** Change Email

**Request Body:**

- Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/ChangeEmail"
}
```

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "title": "Response Change Email Api V1 User Change Email Post"
}
```

- **422**: Validation Error
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/HTTPValidationError"
}
```

### `/api/v1/user/change-firstname`

#### POST
**Summary:** Change Firstname

**Request Body:**

- Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/ChangeFirstname"
}
```

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "title": "Response Change Firstname Api V1 User Change Firstname Post"
}
```

- **422**: Validation Error
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/HTTPValidationError"
}
```

### `/api/v1/user/change-lastname`

#### POST
**Summary:** Change Lastname

**Request Body:**

- Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/ChangeLastname"
}
```

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "title": "Response Change Lastname Api V1 User Change Lastname Post"
}
```

- **422**: Validation Error
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/HTTPValidationError"
}
```

### `/api/v1/user/change-middlename`

#### POST
**Summary:** Change Middlename

**Request Body:**

- Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/ChangeMiddlename"
}
```

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "title": "Response Change Middlename Api V1 User Change Middlename Post"
}
```

- **422**: Validation Error
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/HTTPValidationError"
}
```

### `/api/v1/user/change-password`

#### POST
**Summary:** Change Password

**Request Body:**

- Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/ChangePassword"
}
```

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "title": "Response Change Password Api V1 User Change Password Post"
}
```

- **422**: Validation Error
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/HTTPValidationError"
}
```

### `/api/v1/user/change-username`

#### POST
**Summary:** Change Username

**Request Body:**

- Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/ChangeUsername"
}
```

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "title": "Response Change Username Api V1 User Change Username Post"
}
```

- **422**: Validation Error
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/HTTPValidationError"
}
```

### `/api/v1/user/confirm-email`

#### GET
**Summary:** Confirm Email

**Parameters:**

- `token` (query) **required** - 
```json
{
  "type": "string",
  "title": "Token"
}
```

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "title": "Response Confirm Email Api V1 User Confirm Email Get"
}
```

- **422**: Validation Error
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/HTTPValidationError"
}
```

### `/api/v1/user/confirm-email-change`

#### GET
**Summary:** Confirm Email Change

**Parameters:**

- `token` (query) **required** - 
```json
{
  "type": "string",
  "title": "Token"
}
```

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "title": "Response Confirm Email Change Api V1 User Confirm Email Change Get"
}
```

- **422**: Validation Error
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/HTTPValidationError"
}
```

### `/api/v1/user/get-profile`

#### GET
**Summary:** Get Profile

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/User"
}
```

### `/api/v1/user/get-public-profile/{user_id}`

#### GET
**Summary:** Get Public Profile

**Parameters:**

- `user_id` (path) **required** - 
```json
{
  "type": "integer",
  "title": "User Id"
}
```

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "title": "Response Get Public Profile Api V1 User Get Public Profile  User Id  Get"
}
```

- **422**: Validation Error
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/HTTPValidationError"
}
```

### `/api/v1/user/login`

#### POST
**Summary:** Login

**Request Body:**

- Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/UserLogin"
}
```

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/Token"
}
```

- **422**: Validation Error
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/HTTPValidationError"
}
```

### `/api/v1/user/login/access-token`

#### POST
**Summary:** Login Access Token

OAuth2 compatible token login, get an access token for future requests

**Request Body:**

- Content-Type: `application/x-www-form-urlencoded`
```json
{
  "$ref": "#/components/schemas/Body_login_access_token_api_v1_user_login_access_token_post"
}
```

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/Token"
}
```

- **422**: Validation Error
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/HTTPValidationError"
}
```

### `/api/v1/user/logout`

#### POST
**Summary:** Logout

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "title": "Response Logout Api V1 User Logout Post"
}
```

### `/api/v1/user/refresh`

#### POST
**Summary:** Refresh Token

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/Token"
}
```

### `/api/v1/user/registration`

#### POST
**Summary:** Registration

**Request Body:**

- Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/UserCreate"
}
```

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/User"
}
```

- **422**: Validation Error
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/HTTPValidationError"
}
```

### `/api/v1/user/upload-avatar`

#### POST
**Summary:** Upload Avatar

**Request Body:**

- Content-Type: `multipart/form-data`
```json
{
  "$ref": "#/components/schemas/Body_upload_avatar_api_v1_user_upload_avatar_post"
}
```

**Responses:**

- **200**: Successful Response
  - Content-Type: `application/json`
```json
{
  "title": "Response Upload Avatar Api V1 User Upload Avatar Post"
}
```

- **422**: Validation Error
  - Content-Type: `application/json`
```json
{
  "$ref": "#/components/schemas/HTTPValidationError"
}
```

## Components

### Schemas

#### Body_login_access_token_api_v1_user_login_access_token_post
```json
{
  "properties": {
    "grant_type": {
      "anyOf": [
        {
          "type": "string",
          "pattern": "^password$"
        },
        {
          "type": "null"
        }
      ],
      "title": "Grant Type"
    },
    "username": {
      "type": "string",
      "title": "Username"
    },
    "password": {
      "type": "string",
      "format": "password",
      "title": "Password"
    },
    "scope": {
      "type": "string",
      "title": "Scope",
      "default": ""
    },
    "client_id": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Client Id"
    },
    "client_secret": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "format": "password",
      "title": "Client Secret"
    }
  },
  "type": "object",
  "required": [
    "username",
    "password"
  ],
  "title": "Body_login_access_token_api_v1_user_login_access_token_post"
}
```

#### Body_upload_avatar_api_v1_user_upload_avatar_post
```json
{
  "properties": {
    "file": {
      "type": "string",
      "format": "binary",
      "title": "File"
    }
  },
  "type": "object",
  "required": [
    "file"
  ],
  "title": "Body_upload_avatar_api_v1_user_upload_avatar_post"
}
```

#### ChangeAddress
```json
{
  "properties": {
    "address": {
      "type": "string",
      "title": "Address"
    }
  },
  "type": "object",
  "required": [
    "address"
  ],
  "title": "ChangeAddress"
}
```

#### ChangeBirthdate
```json
{
  "properties": {
    "birthdate": {
      "type": "string",
      "format": "date",
      "title": "Birthdate"
    }
  },
  "type": "object",
  "required": [
    "birthdate"
  ],
  "title": "ChangeBirthdate"
}
```

#### ChangeEmail
```json
{
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "title": "Email"
    }
  },
  "type": "object",
  "required": [
    "email"
  ],
  "title": "ChangeEmail"
}
```

#### ChangeFirstname
```json
{
  "properties": {
    "firstname": {
      "type": "string",
      "title": "Firstname"
    }
  },
  "type": "object",
  "required": [
    "firstname"
  ],
  "title": "ChangeFirstname"
}
```

#### ChangeLastname
```json
{
  "properties": {
    "lastname": {
      "type": "string",
      "title": "Lastname"
    }
  },
  "type": "object",
  "required": [
    "lastname"
  ],
  "title": "ChangeLastname"
}
```

#### ChangeMiddlename
```json
{
  "properties": {
    "middlename": {
      "type": "string",
      "title": "Middlename"
    }
  },
  "type": "object",
  "required": [
    "middlename"
  ],
  "title": "ChangeMiddlename"
}
```

#### ChangePassword
```json
{
  "properties": {
    "old_password": {
      "type": "string",
      "title": "Old Password"
    },
    "new_password": {
      "type": "string",
      "title": "New Password"
    }
  },
  "type": "object",
  "required": [
    "old_password",
    "new_password"
  ],
  "title": "ChangePassword"
}
```

#### ChangeUsername
```json
{
  "properties": {
    "username": {
      "type": "string",
      "title": "Username"
    }
  },
  "type": "object",
  "required": [
    "username"
  ],
  "title": "ChangeUsername"
}
```

#### HTTPValidationError
```json
{
  "properties": {
    "detail": {
      "items": {
        "$ref": "#/components/schemas/ValidationError"
      },
      "type": "array",
      "title": "Detail"
    }
  },
  "type": "object",
  "title": "HTTPValidationError"
}
```

#### Token
```json
{
  "properties": {
    "access_token": {
      "type": "string",
      "title": "Access Token"
    },
    "token_type": {
      "type": "string",
      "title": "Token Type"
    }
  },
  "type": "object",
  "required": [
    "access_token",
    "token_type"
  ],
  "title": "Token"
}
```

#### User
```json
{
  "properties": {
    "email": {
      "anyOf": [
        {
          "type": "string",
          "format": "email"
        },
        {
          "type": "null"
        }
      ],
      "title": "Email"
    },
    "username": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Username"
    },
    "is_active": {
      "anyOf": [
        {
          "type": "boolean"
        },
        {
          "type": "null"
        }
      ],
      "title": "Is Active",
      "default": true
    },
    "is_superuser": {
      "type": "boolean",
      "title": "Is Superuser",
      "default": false
    },
    "firstname": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Firstname"
    },
    "lastname": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Lastname"
    },
    "middlename": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Middlename"
    },
    "birthdate": {
      "anyOf": [
        {
          "type": "string",
          "format": "date"
        },
        {
          "type": "null"
        }
      ],
      "title": "Birthdate"
    },
    "address": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Address"
    },
    "avatar_url": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Avatar Url"
    },
    "id": {
      "anyOf": [
        {
          "type": "integer"
        },
        {
          "type": "null"
        }
      ],
      "title": "Id"
    },
    "created_at": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time"
        },
        {
          "type": "null"
        }
      ],
      "title": "Created At"
    },
    "updated_at": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time"
        },
        {
          "type": "null"
        }
      ],
      "title": "Updated At"
    },
    "is_email_confirmed": {
      "type": "boolean",
      "title": "Is Email Confirmed",
      "default": false
    }
  },
  "type": "object",
  "title": "User"
}
```

#### UserCreate
```json
{
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "title": "Email"
    },
    "username": {
      "type": "string",
      "title": "Username"
    },
    "password": {
      "type": "string",
      "title": "Password"
    },
    "firstname": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Firstname"
    },
    "lastname": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Lastname"
    },
    "middlename": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Middlename"
    },
    "birthdate": {
      "anyOf": [
        {
          "type": "string",
          "format": "date"
        },
        {
          "type": "null"
        }
      ],
      "title": "Birthdate"
    },
    "address": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Address"
    }
  },
  "type": "object",
  "required": [
    "email",
    "username",
    "password"
  ],
  "title": "UserCreate"
}
```

#### UserLogin
```json
{
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "title": "Email"
    },
    "password": {
      "type": "string",
      "title": "Password"
    }
  },
  "type": "object",
  "required": [
    "email",
    "password"
  ],
  "title": "UserLogin"
}
```

#### ValidationError
```json
{
  "properties": {
    "loc": {
      "items": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "integer"
          }
        ]
      },
      "type": "array",
      "title": "Location"
    },
    "msg": {
      "type": "string",
      "title": "Message"
    },
    "type": {
      "type": "string",
      "title": "Error Type"
    }
  },
  "type": "object",
  "required": [
    "loc",
    "msg",
    "type"
  ],
  "title": "ValidationError"
}
```
