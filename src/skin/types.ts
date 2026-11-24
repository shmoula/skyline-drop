export interface SkinManifest {
  name: string;
  buildingTypes: number;
  font: { charWidth: number; charHeight: number };
  planeFrames: number;
  explosionFrames: number;
  colours: { background: string };
  /** Allowed colours (hex). Used by the art QA script only. */
  palette?: string[];
}

/** The only image facts the skin contract cares about. */
export interface ImageLike {
  width: number;
  height: number;
}

export interface Skin<I extends ImageLike = ImageLike> {
  manifest: SkinManifest;
  plane: I;
  bomb: I;
  explosion: I | null;
  ground: I;
  background: I | null;
  font: I;
  /** Index 0 = building type 1. */
  buildings: { floor: I; roof: I }[];
}
