export const ASSET_URLS: Record<string, string> = {
  player:       "/img/player.png",
  rabbit:       "/img/rabbit.png",
  wolf:         "/img/wolf.png",
  mammoth:      "/img/mammoth.png",
  tree:         "/img/tree.png",
  tree_snow:    "/img/tree_snow.png",
  stone:        "/img/stone.png",
  gold:         "/img/gold.png",
  berry_bush:   "/img/berry_bush.png",
  cactus:       "/img/cactus.png",
  campfire:     "/img/campfire.png",
  wall_wood:    "/img/wall_wood.png",
  wall_stone:   "/img/wall_stone.png",
  spike_wood:   "/img/spike_wood.png",
  axe:          "/img/axe.png",
  pick:         "/img/pick.png",
  sword:        "/img/sword.png",
  big_axe:      "/img/big_axe.png",
  gold_axe:     "/img/gold_axe.png",
  gold_sword:   "/img/gold_sword.png",
  berries:      "/img/berries.png",
  raw_meat:     "/img/raw_meat.png",
  cooked_meat:  "/img/cooked_meat.png",
  wood:         "/img/wood.png",
  stone_item:   "/img/stone_item.png",
  gold_item:    "/img/gold_item.png",
  thread:       "/img/thread.png",
  hat_winter:   "/img/hat_winter.png",
  hat_cowboy:   "/img/hat_cowboy.png",
  ground_grass: "/img/ground_grass.png",
  ground_sand:  "/img/ground_sand.png",
  ground_snow:  "/img/ground_snow.png",
  ground_water: "/img/ground_water.png",
  ground_dark:  "/img/ground_dark.png",
  hand:         "/img/hand.png",
};

export class AssetLoader {
  private _images: Map<string, HTMLImageElement> = new Map();

  /** Read-only view of the loaded image map (used by renderers). */
  get images(): ReadonlyMap<string, HTMLImageElement> {
    return this._images;
  }

  loadImage(key: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        this._images.set(key, img);
        resolve();
      };
      img.onerror = () => {
        console.warn(`AssetLoader: failed to load "${key}" from ${url}`);
        // Still resolve so loadAll does not stall on a single missing asset
        resolve();
      };
      img.src = url;
    });
  }

  get(key: string): HTMLImageElement | null {
    return this._images.get(key) ?? null;
  }

  loadAll(assets: { key: string; url: string }[]): Promise<void> {
    return Promise.all(assets.map((a) => this.loadImage(a.key, a.url))).then(
      () => undefined
    );
  }
}
