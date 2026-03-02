export const ASSET_URLS: Record<string, string> = {
  player:       "https://starve.io/img/player.png",
  rabbit:       "https://starve.io/img/rabbit.png",
  wolf:         "https://starve.io/img/wolf.png",
  tree:         "https://starve.io/img/tree.png",
  tree_snow:    "https://starve.io/img/tree_snow.png",
  stone:        "https://starve.io/img/stone.png",
  gold:         "https://starve.io/img/gold.png",
  berry_bush:   "https://starve.io/img/berry_bush.png",
  cactus:       "https://starve.io/img/cactus.png",
  campfire:     "https://starve.io/img/campfire.png",
  wall_wood:    "https://starve.io/img/wall_wood.png",
  wall_stone:   "https://starve.io/img/wall_stone.png",
  spike_wood:   "https://starve.io/img/spike_wood.png",
  axe:          "https://starve.io/img/axe.png",
  pick:         "https://starve.io/img/pick.png",
  sword:        "https://starve.io/img/sword.png",
  big_axe:      "https://starve.io/img/big_axe.png",
  gold_axe:     "https://starve.io/img/gold_axe.png",
  gold_sword:   "https://starve.io/img/gold_sword.png",
  berries:      "https://starve.io/img/berries.png",
  raw_meat:     "https://starve.io/img/raw_meat.png",
  cooked_meat:  "https://starve.io/img/cooked_meat.png",
  wood:         "https://starve.io/img/wood.png",
  stone_item:   "https://starve.io/img/stone_item.png",
  gold_item:    "https://starve.io/img/gold_item.png",
  thread:       "https://starve.io/img/thread.png",
  hat_winter:   "https://starve.io/img/hat_winter.png",
  hat_cowboy:   "https://starve.io/img/hat_cowboy.png",
  ground_grass: "https://starve.io/img/ground_grass.png",
  ground_sand:  "https://starve.io/img/ground_sand.png",
  ground_snow:  "https://starve.io/img/ground_snow.png",
  ground_water: "https://starve.io/img/ground_water.png",
  ground_dark:  "https://starve.io/img/ground_dark.png",
  hand:         "https://starve.io/img/hand.png",
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
