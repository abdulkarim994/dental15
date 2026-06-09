/**
 * X-rays Domain — Phase 6
 *
 * Aggregates all x-ray image related services, repositories, and DTOs.
 *
 * Dependencies:
 *   - Repository: xrays.repository (metadata + thumbnails)
 *   - Services: image.service, image-pipeline.service, r2.service
 *   - Module service: xrays.service (domain facade)
 */

export { xraysRepository } from '@/repositories/xrays.repository'
export { uploadXray, deleteXray, getXrayUrl, getXrayThumbnail } from '@/modules/xrays/xrays.service'
export { createManagedBlobUrl, revokeBlobUrl, revokeAllBlobUrls } from '@/services/image-pipeline.service'
