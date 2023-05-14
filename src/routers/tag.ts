import { loggedInProcedure } from '../middleware/authenticate';
import { publicProcedure, router } from '../trpc';
import { getTags, purgeUnusedTags } from '../controllers/tag';
import { TagOpResSchema, tagReqSchema } from '../schemas/tag';

export const tagRouter = router({
  get: publicProcedure.input(tagReqSchema).query((opts) => {
    const { input } = opts;
    const { query, sortBy } = input;
    const tags = getTags(query, sortBy);
    return TagOpResSchema.parse({
      success: true,
      tags,
    });
  }),
  purgeUnused: loggedInProcedure.mutation(() => {
    // TODO: if multi-user, who should be able to do this?
    const numPurged = purgeUnusedTags();
    return numPurged;
  }),
});
