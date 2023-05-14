import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../trpc';
import { loggedInProcedure } from '../middleware/authenticate';
import {
  createLink,
  deleteLink,
  updateLink,
  getLink,
  getLinks,
  exportLinks,
  importLinks,
  scrapeFQDN,
} from '../controllers/link';
import { CreateLinkReqSchema, GetLinksReqSchema, baseLinkReqSchema } from '../schemas/link';

export const linkRouter = router({
  create: loggedInProcedure.input(CreateLinkReqSchema).mutation((opts) => {
    const { input, ctx } = opts;
    const { user } = ctx;
    const { id: userId } = user;
    const result = createLink(userId, input);
    if (!result.success) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.reason });
    }
    return { success: true, link: result.link };
  }),
  delete: loggedInProcedure.input(z.number()).mutation((opts) => {
    const { input, ctx } = opts;
    const { user } = ctx;
    const { id: userId } = user;
    const linkId = input;
    const result = deleteLink(linkId, userId);
    if (!result.success) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.reason });
    }
    return { success: true };
  }),
  update: loggedInProcedure.input(baseLinkReqSchema).mutation((opts) => {
    const { input, ctx } = opts;
    const { user } = ctx;
    const { id: userId } = user;
    const result = updateLink(userId, input);
    if (!result.success) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.reason });
    }
    return { success: true, link: result.link };
  }),
  getOne: publicProcedure.input(z.number()).query((opts) => {
    const { input, ctx } = opts;
    const { user } = ctx;
    let userId: number | undefined;
    if (user) {
      userId = user.id;
    }
    const result = getLink(input, userId);
    if (!result.success) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.reason });
    }
    return { success: true, link: result.link };
  }),
  getMany: publicProcedure.input(GetLinksReqSchema).query((opts) => {
    const { input } = opts;
    const { query, page, limit } = input;
    const result = getLinks(query, page, limit);
    if (!result.success) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.reason });
    }
    return result;
  }),
  export: loggedInProcedure.query((opts) => {
    const { ctx } = opts;
    const { user } = ctx;
    const { id: userId } = user;
    const result = exportLinks(userId);
    if (!result.success || !result.attachment) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error exporting links. See server logs for details',
      });
    }
    const base64Attachment = Buffer.from(result.attachment).toString('base64');
    return { success: true, attachment: base64Attachment };
  }),
  import: loggedInProcedure.input(z.string()).mutation((opts) => {
    const { input, ctx } = opts;
    const { user } = ctx;
    const { id: userId } = user;
    const attachment = Buffer.from(input, 'base64').toString('utf-8');
    const result = importLinks(attachment, userId);
    if (!result.success) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.reason });
    }
    return { success: true };
  }),
  populateFromFQDN: loggedInProcedure.input(z.string()).query(async (opts) => {
    const { input: url } = opts;
    const scrapedData = await scrapeFQDN(url);
    return scrapedData;
  }),
});