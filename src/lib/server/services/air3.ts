import AWS from "aws-sdk";
import jwt, { type GetPublicKeyOrSecret } from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";
import { MongoClient } from "mongodb";

import { env } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";

import type { Air3UserRole } from "@shared/constants/role";
import { isDevEnv } from "@shared/utils/env";

export type Air3User = {
	email: string;
	id: string;
	abstractAccountAddress: string;
};

export type Air3TokenPayload = {
	type: "partner";
	iss: "air-api";
	jti: string;
	sid: string;
	partnerId: string;
	partnerUserId: string;
	sub: string;
	abstractAccountAddress: string;
	iat: number;
	exp: number;
	aud: string[];
};

const Success = <T>(data: T) => ({
	success: true,
	data,
	error: null,
});

const InternalServerError = () => ({
	success: false,
	data: null,
	error: Response.json({ message: "Something went wrong..." }, { status: 500 }),
});

const AuthorizationError = () => ({
	success: false,
	data: null,
	error: Response.json({ message: "Authorization failed" }, { status: 401 }),
});

export class Air3Service {
	// Air3 vars
	private jwksUri = env.SECRET_AIR3_JWKS;
	private jwks = new JwksClient({
		jwksUri: this.jwksUri,
	});

	// AWS vars
	private region = env.SECRET_AWS_COGNITO_REGION;
	private userPoolId = env.SECRET_AWS_COGNITO_USER_POOL_ID;
	private clientId = env.SECRET_AWS_COGNITO_CLIENT_ID;
	private usersPassword = env.SECRET_AWS_COGNITO_USERS_PWD;
	private accessKey = env.SECRET_AWS_ACCESS_KEY;
	private secretKey = env.SECRET_AWS_SECRET_ACCESS_KEY;

	// Mongo vars
	private dbUrl = env.SECRET_DB_URL;
	private dbName = env.SECRET_DB_NAME;

	private cognito = new AWS.CognitoIdentityServiceProvider({
		region: this.region,
		credentials: {
			accessKeyId: this.accessKey,
			secretAccessKey: this.secretKey,
		},
	});

	private getKey: GetPublicKeyOrSecret = async (header, callback) => {
		try {
			const key = await this.jwks.getSigningKey(header.kid);
			const signingKey = key.getPublicKey();
			callback(null, signingKey);
		} catch (error) {
			callback(error as Error);
		}
	};

	public verifyAir3Token = async (token: string) => {
		if (isDevEnv()) {
			return Success(jwt.decode(token) as { sub: string });
		}

		try {
			const data = (await new Promise((resolve, reject) => {
				jwt.verify(token, this.getKey, {}, (err, decoded) => {
					if (err) {
						reject(new Error(`Token verification failed: ${err.message}`));
					} else {
						resolve(decoded as { sub: string });
					}
				});
			})) as { sub: string };

			return Success(data);
		} catch (error) {
			console.error("Failed to verify Air3 token. ", { error });
			return AuthorizationError();
		}
	};

	public authorizeUser = async (user: Air3User) => {
		try {
			const authResult = await this.cognito
				.adminInitiateAuth({
					UserPoolId: this.userPoolId,
					ClientId: this.clientId,
					AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
					AuthParameters: {
						USERNAME: user.email,
						PASSWORD: this.usersPassword,
					},
				})
				.promise();

			if (authResult.AuthenticationResult) {
				return Success({
					access: authResult.AuthenticationResult.AccessToken,
					refresh: authResult.AuthenticationResult.RefreshToken,
					exp: authResult.AuthenticationResult.ExpiresIn,
				});
			}

			return InternalServerError();
		} catch (error) {
			const e = error as AWS.AWSError;

			console.error({ e });

			// Some configuration or logical error
			if (e.code === "InvalidParameterException") {
				return InternalServerError();
			}

			// User exists but credentials is invalid
			if (e.code === "NotAuthorizedException") {
				return AuthorizationError();
			}

			return Success(null);
		}
	};

	public getUser = async (token: string) => {
		if (!token) {
			return AuthorizationError();
		}

		const { error, data } = await this.verifyAir3Token(token);

		if (error) {
			return AuthorizationError();
		}

		let mongoClient: MongoClient | null = null;

		try {
			mongoClient = new MongoClient(this.dbUrl);

			const db = mongoClient.db(this.dbName);
			const users = db.collection("users");

			const mongoUser = await users.findOne({
				cognitoSub: data!.sub,
			});

			return Success(mongoUser);
		} catch (error) {
			console.error({ error });
			return InternalServerError();
		} finally {
			mongoClient?.close();
		}
	};

	public createUser = async (_user: Air3User) => {
		const { User: cognitoUser } = await this.cognito
			.adminCreateUser({
				UserPoolId: this.userPoolId,
				Username: _user.email,
				TemporaryPassword: this.usersPassword,
				UserAttributes: [
					{
						Name: "email",
						Value: _user.email,
					},
					{
						Name: "custom:air3_id",
						Value: _user.id,
					},
					{
						Name: "custom:air3_abs_acc_address",
						Value: _user.abstractAccountAddress,
					},
				],
				MessageAction: "SUPPRESS",
			})
			.promise();

		if (!cognitoUser) {
			return InternalServerError();
		}

		await this.cognito
			.adminSetUserPassword({
				UserPoolId: this.userPoolId,
				Username: _user.email,
				Password: this.usersPassword,
				Permanent: true,
			})
			.promise();

		let mongoClient: MongoClient | null = null;

		try {
			mongoClient = new MongoClient(this.dbUrl);

			const db = mongoClient.db(this.dbName);
			const users = db.collection("users");

			const sub = cognitoUser.Attributes?.find((attr) => attr.Name === "sub")?.Value;
			const email = cognitoUser.Attributes?.find((attr) => attr.Name === "email")?.Value || null;

			if (!sub) {
				return InternalServerError();
			}

			const username = "username_" + (sub.length >= 5 ? sub.substring(0, 5) : sub);

			const mongoUser = await users.insertOne({
				cognitoSub: sub,
				username,
				email,
				name: null,
				stagename: null,
				profileImageUrl: `${publicEnv.PUBLIC_API_URL}/dev/images/user.jpg`,
				phoneNumber: null,
				pronouns: null,
				town: null,
				country: null,
				locale: null,
				content: [],
				contests: [],
				wins: 0,
				followersCount: 0,
				followingCount: 0,
				verified: false,
				createdAt: Date.now(),
				version: 0.5,
				status: "new",
				signInType: "air3",
				biography: "No bio yet",
				air3Role: null,
			});

			return Success(mongoUser.insertedId.toString());
		} catch (error) {
			console.error({ error });
			return InternalServerError();
		} finally {
			mongoClient?.close();
		}
	};

	public addRole = async (token: string, role: Air3UserRole) => {
		if (!token) {
			return AuthorizationError();
		}

		const tokenVerifyingResult = await this.verifyAir3Token(token);

		if (tokenVerifyingResult.error) {
			return tokenVerifyingResult;
		}

		let mongoClient: MongoClient | null = null;

		try {
			mongoClient = new MongoClient(this.dbUrl);

			const db = mongoClient.db(this.dbName);
			const users = db.collection("users");

			const mongoUser = await users.updateOne(
				{ cognitoSub: tokenVerifyingResult.data.sub },
				{
					$set: {
						air3Role: role,
					},
				}
			);

			const m = await users.findOne({
				cognitoSub: tokenVerifyingResult.data.sub,
			});

			console.log({ m });

			return Success(mongoUser.upsertedId?.toString());
		} catch (error) {
			console.error({ error });
			return InternalServerError();
		} finally {
			mongoClient?.close();
		}
	};
}
