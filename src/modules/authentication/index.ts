import { Elysia, t } from "elysia";
import { comparePassword, hashPassword } from "../../utils/crypto";
import { prisma } from "../../libs/prisma";
import { accountBodyType, loginBodyType, patchAccountBodyType } from "./types";
import { buildApiResponse } from "../../utils/api";
import { isAuthenticated } from "../../middlewares/authentication";
import { uploadImageToFirebase } from "../../utils/upload";
import { getErrorMessage } from "../../utils/errors";

export const authentification = (app: Elysia) =>
  app.group("/auth", (app) =>
    app
      .post(
        "/signup",
        async ({ body, set }) => {
          const { email, password, passwordAgain } = body;
          try {
          if (password === passwordAgain) {
            const { hash } = await hashPassword(password);

            
            const newAccount = await prisma.account.create({
              data: {
                email,
                hash,
                role: "STANDARD",
              },
              select: {
                id: true,
                email: true
              }
            }); 
          
            set.status = "Created";
            return buildApiResponse(
              true,
              "account successfully create",
              newAccount
            );
          } else {
            set.status = "Bad Request";
            return buildApiResponse(false, "Passwords don't match");
          }
        } catch (error: any) {
          set.status = "Bad Request"; 
          return buildApiResponse(false, getErrorMessage(error.code));
        }
        },
        {
          body: accountBodyType,
          detail: { tags: ["auth"] },
        }
      )
      .post(
        "/login",
        async ({ body, jwt, set, cookie: { access_token } }) => {
          const { email, password } = body;
          const account = await prisma.account.findFirst({
            where: {
              email,
            },
            select: {
              id: true,
              hash: true,
            },
          });

          if (!account) {
            set.status = 401;
            return buildApiResponse(false, "wrong email or password");
          }
          // check password
          const match = await comparePassword(password, account.hash);

          if (!match) {
            set.status = 401;
            return buildApiResponse(false, "wrong email or password");
          }

          // login OK!
          const accessToken = await jwt.sign({
            accountId: account.id,
          });

          access_token.value = accessToken;
          access_token.domain = process.env.COOKIE_DOMAIN;
          access_token.maxAge = 15 * 60;
          access_token.secure = true;
          access_token.sameSite = "strict";
          access_token.httpOnly = true;
          access_token.path = "/";

          return buildApiResponse(true, "login successful.");
        },
        { body: loginBodyType, detail: { tags: ["auth"] } }
      )
      .get(
        "/logout",
        ({ cookie: { access_token } }) => {
          // access_token.remove() is not working, so we use a workaround
          access_token.set({
            path: "/",
            domain: process.env.COOKIE_DOMAIN,
            maxAge: 0,
            value: "",
          });

          return buildApiResponse(true, "logout successful.");
        },
        { detail: { tags: ["auth"] } }
      )
      .use(isAuthenticated)
      .get(
        "/profile",
        ({ account, error }) => {
          if (account) {
            return buildApiResponse(true, "profile", account);
          }
          return error;
        },
        { detail: { tags: ["auth"] } }
      )
      .patch(
        "/profile",
        async ({ account, error, body, set }) => {
          if (!account) {
            return error;
          }

          const {
            id,
            profile,
            profileImage,
            email,
            password,
            newPassword,
            newPasswordAgain,
            active,
            role,
          } = body;

          let profileToUpdateOrCreate = {};
          let accountToUpdateByUser = { email };

          // only admin can update another account
          const idToUpdate = account.role === "ADMIN" ? id : account.id;

          if (profileImage) {
            // upload profile image and get url
            const uploadResult = await uploadImageToFirebase(profileImage, account.id, 'profile-image');

            if (!uploadResult.success) {
              set.status = "Bad Request";
              return buildApiResponse(false, uploadResult.error ?? "");
            }

            let profileImageUrl = uploadResult.url ?? "";
            profileToUpdateOrCreate = {
              ...profileToUpdateOrCreate,
              profileImage: profileImageUrl,
            };
          }

          if (profile) {
            const { firstName, lastName, address, phoneNumber } = profile;

            profileToUpdateOrCreate = {
              ...profileToUpdateOrCreate,
              firstName,
              lastName,
              address,
              phoneNumber,
            };
          }

          if (password && newPassword && newPasswordAgain) {
            if (newPassword !== newPasswordAgain) {
              set.status = 401;
              return buildApiResponse(false, "passwords don't match");
            }

            // check password
            const match = await comparePassword(password, account.hash);

            if (!match) {
              set.status = 401;
              return buildApiResponse(false, "wrong password");
            }

            const { hash } = await hashPassword(newPassword);

            // update password in database
            accountToUpdateByUser = { ...accountToUpdateByUser, hash };
          }

          let fieldsToUpdateByAdmin;
          if (account.role === "ADMIN") {
            fieldsToUpdateByAdmin = {
              active,
              role,
            };
          }

          const updatedAccount = await prisma.account.update({
            where: {
              id: idToUpdate,
            },
            data: {
              ...accountToUpdateByUser,
              ...fieldsToUpdateByAdmin,
              profile: account.profile
                ? { update: profileToUpdateOrCreate }
                : { create: profileToUpdateOrCreate },
              updateDate: new Date(),
            },
            include: { profile: true },
          });

          return buildApiResponse(true, "account updated", updatedAccount);
        },
        { body: patchAccountBodyType, detail: { tags: ["auth"] } }
      )
  );
