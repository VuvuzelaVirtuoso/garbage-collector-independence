import { Outfit, OutfitSpec } from "grimoire-kolmafia";
import {
  cliExecute,
  inebrietyLimit,
  Item,
  myClass,
  myFamiliar,
  myFury,
  myInebriety,
  retrieveItem,
  toJson,
  totalTurnsPlayed,
} from "kolmafia";
import {
  $class,
  $familiar,
  $item,
  $items,
  $skill,
  Delayed,
  get,
  getKramcoWandererChance,
  have,
  undelay,
} from "libram";
import { barfFamiliar } from "../familiar";
import { chooseBjorn } from "./bjorn";
import { bonusGear } from "./dropsgear";
import {
  bestBjornalike,
  BonusEquipMode,
  cleaverCheck,
  validateGarbageFoldable,
  valueOfItem,
  valueOfMeat,
} from "./lib";

function chooseGun({ familiar }: Outfit) {
  if (familiar === $familiar`Robortender` && have($item`love`)) return $item`love`;
  if (!have($item`ice nine`)) {
    cliExecute("refresh inventory");
    retrieveItem($item`ice nine`);
  }

  return have($item`ice nine`) ? $item`ice nine` : null;
}

function gunSpec(outfit: Outfit) {
  if (!outfit.canEquip($item`unwrapped knock-off retro superhero cape`)) {
    return { available: false, items: [] };
  }

  const gun = chooseGun(outfit);
  if (!gun) return { available: false, items: [] };

  return {
    available: true,
    items: {
      back: $item`unwrapped knock-off retro superhero cape`,
      weapon: gun,
      equip: $items`mafia pointer finger ring`,
      modes: {
        retrocape: ["robot", "kill"],
      },
    } as OutfitSpec,
  };
}

const POINTER_RING_SPECS: (
  outfit: Outfit
) => Delayed<{ available: boolean; items: Item[] | OutfitSpec }>[] = (outfit: Outfit) => [
  {
    available: have($skill`Furious Wallop`) && myFury() > 0,
    items: $items`mafia pointer finger ring`,
  },
  {
    available: have($skill`Head in the Game`),
    items: $items`mafia pointer finger ring`,
  },
  {
    available: myClass() === $class`Turtle Tamer`,
    items: $items`Operation Patriot Shield, mafia pointer finger ring`,
  },
  {
    available: true,
    items: $items`haiku katana, mafia pointer finger ring`,
  },
  () => gunSpec(outfit),
  {
    available: true,
    items: $items`Operation Patriot Shield, mafia pointer finger ring`,
  },
];

const trueInebrietyLimit = () => inebrietyLimit() - (myFamiliar() === $familiar`Stooper` ? 1 : 0);

export function barfOutfit(spec: OutfitSpec = {}, sim = false): Outfit {
  cleaverCheck();
  validateGarbageFoldable(spec);
  const outfit = Outfit.from(
    spec,
    new Error(`Failed to construct outfit from spec ${toJson(spec)}!`)
  );

  outfit.familiar ??= barfFamiliar();

  const bjornChoice = chooseBjorn(BonusEquipMode.BARF, outfit.familiar, sim);

  outfit.modifier.push(
    `${valueOfMeat(BonusEquipMode.BARF)} Meat Drop`,
    `${valueOfItem(BonusEquipMode.BARF)} Item Drop`,
    "-tie"
  );

  if (myInebriety() > trueInebrietyLimit()) {
    if (!outfit.equip($item`Drunkula's wineglass`)) {
      throw new Error("We're overdrunk but have found ourself unable to equip a wineglass!");
    }
  } else {
    if (
      have($item`protonic accelerator pack`) &&
      get("questPAGhost") === "unstarted" &&
      get("nextParanormalActivity") <= totalTurnsPlayed()
    ) {
      outfit.equip($item`protonic accelerator pack`);
    }

    for (const spec of POINTER_RING_SPECS(outfit)) {
      const { available, items } = undelay(spec);
      if (available && outfit.tryEquip(items)) break;
    }
  }

  if (getKramcoWandererChance() > 0.05) outfit.equip($item`Kramco Sausage-o-Matic™`);

  outfit.bonuses = bonusGear(BonusEquipMode.BARF, !sim);
  const bjornalike = bestBjornalike(outfit);
  if (bjornalike) {
    outfit.setBonus(bjornalike, bjornChoice.value);
    const other = $items`Buddy Bjorn, Crown of Thrones`.filter((i) => i !== bjornalike)[0];
    outfit.avoid.push(other);

    switch (bjornalike) {
      case $item`Buddy Bjorn`:
        outfit.bjornify(bjornChoice.familiar);
        break;
      case $item`Crown of Thrones`:
        outfit.enthrone(bjornChoice.familiar);
        break;
    }
  }

  outfit.setModes({
    snowsuit: "nose",
    parka: "kachungasaur",
  });

  return outfit;
}
