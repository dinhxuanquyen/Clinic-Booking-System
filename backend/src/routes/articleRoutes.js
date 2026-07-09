import express from 'express';
import {
  articleFeaturedRules,
  articleIdRule,
  articleRules,
  articleSlugRule,
  articleStatusRules,
  createAdminArticle,
  createDoctorArticle,
  deleteAdminArticle,
  deleteDoctorArticle,
  getPublicArticleBySlug,
  listAdminArticles,
  listDoctorArticles,
  listPublicArticles,
  publicArticleQueryRules,
  updateAdminArticle,
  updateAdminArticleFeatured,
  updateAdminArticleStatus,
  updateDoctorArticle
} from '../controllers/articleController.js';
import { auth } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();
export const doctorArticleRouter = express.Router();
export const adminArticleRouter = express.Router();

router.get('/', publicArticleQueryRules, validate, listPublicArticles);
router.get('/:slug', articleSlugRule, validate, getPublicArticleBySlug);

doctorArticleRouter.use(auth, roleMiddleware('doctor'));
doctorArticleRouter.get('/', listDoctorArticles);
doctorArticleRouter.post('/', articleRules, validate, createDoctorArticle);
doctorArticleRouter.put('/:id', articleIdRule, articleRules, validate, updateDoctorArticle);
doctorArticleRouter.delete('/:id', articleIdRule, validate, deleteDoctorArticle);

adminArticleRouter.use(auth, roleMiddleware('admin'));
adminArticleRouter.get('/', listAdminArticles);
adminArticleRouter.post('/', articleRules, validate, createAdminArticle);
adminArticleRouter.put('/:id', articleIdRule, articleRules, validate, updateAdminArticle);
adminArticleRouter.patch('/:id/status', articleStatusRules, validate, updateAdminArticleStatus);
adminArticleRouter.patch('/:id/featured', articleFeaturedRules, validate, updateAdminArticleFeatured);
adminArticleRouter.delete('/:id', articleIdRule, validate, deleteAdminArticle);

export default router;
