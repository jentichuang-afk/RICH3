/**
 * combat_engine.js - 三國大富翁戰鬥引擎
 * 包含：applyTeamSkills, getBestSiegeTeam, executeSiege
 * 依賴：utils.js (getEffectiveStat, applyInjury, getCityToll, etc.)
 */

// 處理團隊特技光環加成
function applyTeamSkills(teamIds, teamStats, enemyIds = [], isDefense = false, landInfo = null) {
    teamIds.forEach(id => {
        if (OFFICER_SKILLS[id]) {
            OFFICER_SKILLS[id].effect(teamStats, enemyIds, isDefense, landInfo);

            // Phase 71: 能力 101 以上者，原先特技獲得大幅強化 (疊加一次)
            const o = getOfficer(id);
            if (o && o.injuryRate === 0) {
                let hasBreakthrough = false;
                for (let i = 1; i <= 6; i++) {
                    if (getEffectiveStat(o, i) >= 101) {
                        hasBreakthrough = true;
                        break;
                    }
                }
                if (hasBreakthrough) {
                    OFFICER_SKILLS[id].effect(teamStats, enemyIds, isDefense, landInfo);
                }
            }
        }
    });
}

// ============================================================
// 計算 AI 最佳攻城陣容 (>50% 勝率)
// ============================================================
function getBestSiegeTeam(attackerOfficerIds, defenderIds, cityId = -1, useBuff = false, forUI = false) {
    const validAttackerIds = attackerOfficerIds.filter(id => { let o = getOfficer(id); return o && !o.isDead; });
    const landInfo = (cityId !== -1) ? MAP_DATA[cityId] : null;
    let bestTeam = null;
    let maxWins = forUI ? -1 : 2;

    const defStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    defenderIds.forEach(id => {
        const o = getOfficer(id);
        if (o) for (let i = 1; i <= 6; i++) defStats[i] += getEffectiveStat(o, i);
    });

    const evaluateTeamWinRate = (teamIds) => {
        let expectedWins = 0;
        let totalStats = 0;
        const atkStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        teamIds.forEach(id => {
            const o = getOfficer(id);
            if (o) {
                for (let i = 1; i <= 6; i++) {
                    let eff = getEffectiveStat(o, i);
                    atkStats[i] += eff;
                    totalStats += eff;
                }
            }
        });

        let currentDefStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        for (let i = 1; i <= 6; i++) currentDefStats[i] = defStats[i];
        applyTeamSkills(defenderIds, currentDefStats, teamIds, true, landInfo);

        // 地利加成 (規則 1: 建設加成)
        const geoBonus = (landInfo) ? getDevelopmentGeoBonus(landInfo.development || 0) : 0;
        if (geoBonus > 0) {
            for (let i = 1; i <= 6; i++) currentDefStats[i] = Math.ceil(currentDefStats[i] * (1 + geoBonus / 100));
        }

        // 地利加成 (規則 2+3: 連橫 + 中心加成)
        const chainBonus = (landInfo) ? getCityChainLength(landInfo.owner, landInfo.id) : 0;
        if (chainBonus > 0) {
            for (let i = 1; i <= 6; i++) currentDefStats[i] = Math.ceil(currentDefStats[i] * (1 + chainBonus / 100));
        }

        applyTeamSkills(teamIds, atkStats, defenderIds, false, landInfo);

        if (useBuff) {
            for (let i = 1; i <= 6; i++) {
                atkStats[i] = Math.ceil(atkStats[i] * 1.10);
            }
        }

        let atkStr = atkStats[1], defStr = currentDefStats[1];
        let strWeight = 1;

        let dominantTeamPrediction = null;
        if (atkStr > defStr) dominantTeamPrediction = teamIds;
        else if (defStr > atkStr) dominantTeamPrediction = defenderIds;

        if (dominantTeamPrediction) {
            dominantTeamPrediction.forEach(id => {
                let o = getOfficer(id);
                if (o) {
                    if (getEffectiveStat(o, 1) >= 101 && o.injuryRate === 0) strWeight += 2;
                    else if (getEffectiveStat(o, 1) >= 95) strWeight += 1;
                }
            });
        }

        const totalOutcomes = 5 + strWeight;

        for (let i = 1; i <= 6; i++) {
            if (atkStats[i] > currentDefStats[i]) {
                expectedWins += (i === 1) ? strWeight : 1;
            }
        }
        return { wins: expectedWins, totalStats, totalOutcomes };
    };

    let minTotalStats = Infinity;
    let bestRate = -1;
    let bestWins = 0;
    let bestDenom = 6;

    const checkTeam = (team) => {
        let res = evaluateTeamWinRate(team);
        let currentRate = res.wins / res.totalOutcomes;

        if (!forUI && currentRate <= 0.49) return;

        // 使用極小值來避免浮點數比較誤差
        const isSameRate = Math.abs(currentRate - bestRate) < 1e-7;

        if (currentRate > bestRate && !isSameRate) {
            bestRate = currentRate;
            bestWins = res.wins;
            bestDenom = res.totalOutcomes;
            minTotalStats = res.totalStats;
            bestTeam = team;
        } else if (isSameRate && res.totalStats < minTotalStats) {
            bestRate = currentRate;
            bestWins = res.wins;
            bestDenom = res.totalOutcomes;
            minTotalStats = res.totalStats;
            bestTeam = team;
        }
    };


    const officers = validAttackerIds;
    const n = Math.min(officers.length, 20);

    for (let i = 0; i < n; i++) checkTeam([officers[i]]);
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) checkTeam([officers[i], officers[j]]);
    }
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            for (let k = j + 1; k < n; k++) checkTeam([officers[i], officers[j], officers[k]]);
        }
    }

    return { team: bestTeam, rate: bestTeam ? bestRate : 0 };
}

// ============================================================
// 執行攻城結算
// ============================================================
function executeSiege(attacker, landInfo, attackingIds, consumedBuff = false) {
    const defenderId = landInfo.owner;
    const defender = GAME_STATE.players[defenderId];
    const defendingIds = landInfo.defenders;

    attacker.officers = attacker.officers.filter(id => id != null && !attackingIds.includes(id));
    updateOfficerCountUI(attacker.id);

    let atkStr = 0, defStr = 0;
    attackingIds.forEach(id => { let o = getOfficer(id); if (o) atkStr += getEffectiveStat(o, 1); });
    defendingIds.forEach(id => { let o = getOfficer(id); if (o) defStr += getEffectiveStat(o, 1); });

    let dominantTeam = null;
    let dominantName = "";
    if (atkStr > defStr) { dominantTeam = attackingIds; dominantName = "攻方"; }
    else if (defStr > atkStr) { dominantTeam = defendingIds; dominantName = "守方"; }

    let statPool = [1, 2, 3, 4, 5, 6];
    let extraStrCount = 0;
    let hasSuperStr = false;

    if (dominantTeam) {
        dominantTeam.forEach(id => {
            let o = getOfficer(id);
            if (o) {
                if (getEffectiveStat(o, 1) >= 101 && o.injuryRate === 0) {
                    extraStrCount += 2;
                    statPool.push(1, 1);
                    hasSuperStr = true;
                } else if (getEffectiveStat(o, 1) >= 95) {
                    extraStrCount += 1;
                    statPool.push(1);
                }
            }
        });
    }

    if (extraStrCount > 0) {
        if (hasSuperStr) {
            log(`💪 【萬夫莫敵】戰場出現武力突破極限的猛將，且${dominantName}武力佔優，硬碰硬的機率巨幅疊加提升！(累積票數: ${extraStrCount})`);
        } else {
            log(`💪 【一夫當關】${dominantName}擁有多名驍勇虎將且總力佔優，硬碰硬的機率疊加提升！(累積票數: ${extraStrCount})`);
        }
    }
    const statRoll = statPool[Math.floor(Math.random() * statPool.length)];
    const statNames = { 1: '武力', 2: '智力', 3: '統率', 4: '政治', 5: '魅力', 6: '運氣' };
    const statName = statNames[statRoll];

    let attackerScore = 0;
    const atkTempStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    attackingIds.forEach(id => {
        const o = getOfficer(id);
        if (o) { for (let i = 1; i <= 6; i++) atkTempStats[i] += getEffectiveStat(o, i); }
    });
    applyTeamSkills(attackingIds, atkTempStats, defendingIds, false, landInfo);
    attackerScore = atkTempStats[statRoll];

    if (attacker.siegeBuff || consumedBuff) {
        attacker.siegeBuff = false;
        const defenderPlayer = (landInfo.owner) ? GAME_STATE.players[landInfo.owner] : null;
        const shieldIndex = defenderPlayer ? defenderPlayer.items.findIndex(it => it.id === 6) : -1;

        if (shieldIndex !== -1) {
            log(`🛡️ 【無懈可擊】！${defenderPlayer.name} 識破了敵方的臨陣磨槍，加成無效！`);
            consumeItem(defenderPlayer, shieldIndex);
        } else {
            log(`🔥 【臨陣磨槍】發動！攻城方比拚項目提升 10%！`);
            attackerScore = Math.floor(attackerScore * 1.10);
        }
    }

    let defenderScore = 0;
    const defTempStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    defendingIds.forEach(id => {
        const o = getOfficer(id);
        if (o) { for (let i = 1; i <= 6; i++) defTempStats[i] += getEffectiveStat(o, i); }
    });
    applyTeamSkills(defendingIds, defTempStats, attackingIds, true, landInfo);
    defenderScore = defTempStats[statRoll];

    // 地利加成 (規則 1: 建設加成)
    const geoBonus = (landInfo) ? getDevelopmentGeoBonus(landInfo.development || 0) : 0;
    if (geoBonus > 0) {
        defenderScore = Math.ceil(defenderScore * (1 + geoBonus / 100));
    }

    // 地利加成 (規則 2+3: 連橫 + 中心加成)
    const chainBonus = getCityChainLength(landInfo.owner, landInfo.id);
    if (chainBonus > 0) {
        log(`🏰 【連橫效應】此城發揮連橫地利，全防守屬性提升 ${chainBonus}%！`);
        defenderScore = Math.ceil(defenderScore * (1 + chainBonus / 100));
    }

    let isAttackerWin = attackerScore > defenderScore;

    // Phase 31: 頂尖智將「絕境逆轉」
    let reversalProc = false;
    let reversalHtml = "";
    let reversalSacrificeId = null;
    let actingStrategistIdGlobal = null;
    let losingIdsForCheck = isAttackerWin ? defendingIds : attackingIds;
    let winningIdsForCheck = isAttackerWin ? attackingIds : defendingIds;

    let maxWinnerInt = 0;
    winningIdsForCheck.forEach(id => {
        const o = getOfficer(id);
        if (o && getEffectiveStat(o, 2) >= 95) {
            maxWinnerInt = Math.max(maxWinnerInt, getEffectiveStat(o, 2));
        }
    });

    let superStrategistId = losingIdsForCheck.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 2) >= 101 && o.injuryRate === 0 && getEffectiveStat(o, 2) > maxWinnerInt;
    });

    let topStrategistId = losingIdsForCheck.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 2) >= 95 && getEffectiveStat(o, 2) > maxWinnerInt;
    });

    let revChance = superStrategistId ? 0.75 : (topStrategistId ? 0.50 : 0);
    let actingStrategistId = superStrategistId || topStrategistId;

    if (actingStrategistId && Math.random() < revChance) {
        reversalProc = true;
        actingStrategistIdGlobal = actingStrategistId;
        isAttackerWin = !isAttackerWin;
        playReversalAnimation();
        const strategistName = getOfficer(actingStrategistId).name;

        if (superStrategistId) {
            reversalSacrificeId = superStrategistId;
            reversalHtml = `<div style="margin-top: 15px; padding: 10px; background: rgba(156, 39, 176, 0.2); border: 2px solid #9C27B0; border-radius: 5px;">
                <div style="color: #9C27B0; font-weight: bold; margin-bottom: 5px;">【神鬼莫測】絕境逆轉！</div>
                <div style="font-size: 14px; margin-top: 5px;">✨ <strong>${strategistName}</strong> 犧牲自我發動奇謀，成功扭轉了戰局！隊友毫髮無傷！</div>
            </div>`;
            log(`✨ 【神鬼莫測】${strategistName} 智力突破極限，犧牲自我發動奇謀扭轉戰局，且保護了其他隊友！`);
        } else {
            reversalHtml = `<div style="margin-top: 15px; padding: 10px; background: rgba(156, 39, 176, 0.2); border: 1px solid #9C27B0; border-radius: 5px;">
                <div style="color: #9C27B0; font-weight: bold; margin-bottom: 5px;">【神機妙算】絕境逆轉！</div>
                <div style="font-size: 14px; margin-top: 5px;">✨ <strong>${strategistName}</strong> 在絕境中看破敵陣，雙方兩敗俱傷，攻城瓦解！</div>
            </div>`;
            log(`✨ 【神機妙算】${strategistName} 智力超群，在絕境中看破敵陣，雙方兩敗俱傷，攻方無功而返，守方亦未得錢糧！`);
        }
    }

    // Phase 26: 紀錄戰績
    attackingIds.forEach(id => {
        const o = getOfficer(id);
        if (o) { o.battleCount++; if (isAttackerWin) o.winCount++; }
    });
    defendingIds.forEach(id => {
        const o = getOfficer(id);
        if (o) { o.battleCount++; if (!isAttackerWin) o.winCount++; }
    });

    let winningTeamIds = isAttackerWin ? attackingIds : defendingIds;
    let losingTeamIds = isAttackerWin ? defendingIds : attackingIds;
    let growthHtml = "";
    let injuryHtml = "";

    let pointDiff = Math.abs(attackerScore - defenderScore);
    let winInjuryRate = 0.1;
    let loseInjuryRate = 0.5;

    if (statRoll === 1) {
        winInjuryRate *= 2;
        loseInjuryRate *= 2;
    }
    if (pointDiff > 50) {
        loseInjuryRate = 1.0;
    } else if (pointDiff < 10) {
        winInjuryRate *= 0.5;
        loseInjuryRate *= 0.5;
    }

    let winnerSuperCommander = winningTeamIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 3) >= 101 && o.injuryRate === 0;
    });
    let loserSuperCommander = losingTeamIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 3) >= 101 && o.injuryRate === 0;
    });
    let winnerTopCommander = winningTeamIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 3) >= 95;
    });
    let loserTopCommander = losingTeamIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 3) >= 95;
    });

    let winnerCmdName = winnerSuperCommander ? getOfficer(winnerSuperCommander).name : (winnerTopCommander ? getOfficer(winnerTopCommander).name : "");
    let loserCmdName = loserSuperCommander ? getOfficer(loserSuperCommander).name : (loserTopCommander ? getOfficer(loserTopCommander).name : "");

    const preBattleAttackerLuckHealerId = attackingIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 6) >= 95;
    });
    const preBattleDefenderLuckHealerId = defendingIds.find(id => {
        const o = getOfficer(id);
        return o && getEffectiveStat(o, 6) >= 95;
    });

    winningTeamIds.forEach(id => {
        const o = getOfficer(id);
        if (o) {
            if (Math.random() < 0.75) {
                const oldVal = o.stats[statRoll];
                o.stats[statRoll] += 1;
                const newVal = o.stats[statRoll];
                growthHtml += `<div style="font-size: 14px; margin-top: 5px;">⬆️ <strong>${o.name}</strong> 的【${statName}】提升了 1 點！</div>`;
                log(`✨ ${o.name} 在戰鬥中得到了成長，【${statName}】提升了 1 點！`);
                if (oldVal < 95 && newVal >= 95 && [1, 2, 3, 4, 5, 6].includes(statRoll)) {
                    playAwakeningAnimation(o.name, statName);
                    log(`🎊 【覺醒】${o.name} 突破極限，領悟了新的隱藏特技！`);
                }
                if (oldVal < 101 && newVal >= 101 && [1, 2, 3, 4, 5, 6].includes(statRoll)) {
                    playBreakthroughAnimation(o.name, statName);
                    log(`⭐ 【破極】${o.name} 登峰造極，原先特技獲得了大幅強化！`);
                }
            }
            if (reversalProc) {
                let dmg = 0;
                let auraStr = "";
                let isStrategist = (id === actingStrategistIdGlobal);
                if (isStrategist) {
                    dmg = Math.floor(Math.random() * 50) + 50;
                    auraStr = reversalSacrificeId ? ' (神鬼莫測代價)' : ' (神機妙算代價)';
                } else {
                    if (reversalSacrificeId) {
                        dmg = 0;
                    } else {
                        dmg = Math.floor(Math.random() * 50) + 1;
                        auraStr = ' (神機妙算代價)';
                    }
                }
                if (dmg > 0) {
                    if (winnerSuperCommander) {
                        if (id !== winnerSuperCommander) { dmg = 0; auraStr = ` 🛡️(${winnerCmdName} 神級指揮，免疫受傷)`; }
                        else { dmg = Math.floor(dmg / 2); auraStr += ` 🛡️(${winnerCmdName} 神級指揮，代價減半)`; }
                    } else if (winnerTopCommander) {
                        dmg = Math.floor(dmg / 2);
                        auraStr += ` 🛡️(${winnerCmdName} 統整，代價減半)`;
                    }
                }
                if (dmg > 0) {
                    applyInjury(o, dmg);
                    injuryHtml += `<div style="font-size: 14px; margin-top: 5px;">🩸 <strong>${o.name}</strong> 因逆轉奇謀，重創 ${dmg}%！${auraStr}</div>`;
                    log(`🩸 ${o.name} 承受逆轉代價，陷入 ${dmg}% 的重傷！${auraStr}`);
                } else if (auraStr && actingStrategistIdGlobal) {
                    injuryHtml += `<div style="font-size: 14px; margin-top: 5px;">🛡️ <strong>${o.name}</strong> 在 ${winnerCmdName} 保護下，免於逆轉重創！</div>`;
                    log(`🛡️ ${o.name} 在 ${winnerCmdName} 保護下，免於逆轉重創！`);
                }
            } else {
                if (Math.random() < winInjuryRate) {
                    let dmg = Math.floor(Math.random() * 81) + 10;
                    let auraStr = "";
                    if (winnerSuperCommander) {
                        if (id !== winnerSuperCommander) { dmg = 0; auraStr = ` 🛡️(${winnerCmdName} 神級指揮，友軍無傷)`; }
                        else { dmg = Math.floor(dmg / 2); auraStr = ` 🛡️(${winnerCmdName} 神級指揮降傷)`; }
                    } else {
                        if (winnerTopCommander) { dmg = Math.floor(dmg / 2); auraStr = ` 🛡️(${winnerCmdName} 統整降低傷亡)`; }
                    }
                    if (dmg > 0 && getEffectiveStat(o, 5) >= 95 && Math.random() < 0.30) {
                        dmg = 0;
                        log(`✨ 【百折不休】發動！${o.name} 魅力驚人，麾下將士死命保護，免疫了本次戰役受傷！`);
                    }
                    if (dmg > 0) {
                        applyInjury(o, dmg);
                        injuryHtml += `<div style="font-size: 14px; margin-top: 5px;">⚠️ <strong>${o.name}</strong> 在激戰中掛彩，能力下降 ${dmg}%！${auraStr}</div>`;
                        log(`⚠️ ${o.name} 戰勝後掛彩，能力下降 ${dmg}%！`);
                    }
                }
            }
        }
    });

    losingTeamIds.forEach(id => {
        const o = getOfficer(id);
        if (o) {
            if (Math.random() < 0.25) {
                const oldVal = o.stats[statRoll];
                o.stats[statRoll] += 1;
                const newVal = o.stats[statRoll];
                growthHtml += `<div style="font-size: 14px; margin-top: 5px;">🔥 <strong>${o.name}</strong> 越挫越勇，【${statName}】提升了 1 點！</div>`;
                log(`🔥 ${o.name} 從敗軍中記取教訓，【${statName}】提升了 1 點！`);
                if (oldVal < 95 && newVal >= 95 && [1, 2, 3, 4, 5, 6].includes(statRoll)) {
                    playAwakeningAnimation(o.name, statName);
                    log(`🎊 【覺醒】${o.name} 突破極限，領悟了新的隱藏特技！`);
                }
                if (oldVal < 101 && newVal >= 101 && [1, 2, 3, 4, 5, 6].includes(statRoll)) {
                    playBreakthroughAnimation(o.name, statName);
                    log(`⭐ 【破極】${o.name} 登峰造極，原先特技獲得了大幅強化！`);
                }
            }
            if (Math.random() < loseInjuryRate) {
                let dmg = Math.floor(Math.random() * 81) + 10;
                let auraStr = "";
                if (loserSuperCommander) {
                    if (id !== loserSuperCommander) { dmg = 0; auraStr = ` 🛡️(${loserCmdName} 神級指揮，友軍無傷)`; }
                    else { dmg = Math.floor(dmg / 2); auraStr = ` 🛡️(${loserCmdName} 神級指揮降傷)`; }
                } else {
                    if (loserTopCommander) { dmg = Math.floor(dmg / 2); auraStr = ` 🛡️(${loserCmdName} 統整降低傷亡)`; }
                }
                if (dmg > 0 && getEffectiveStat(o, 5) >= 95 && Math.random() < 0.30) {
                    dmg = 0;
                    log(`✨ 【百折不休】發動！${o.name} 魅力驚人，麾下將士死命保護，免疫了本次戰敗受傷！`);
                }
                if (dmg > 0) {
                    applyInjury(o, dmg);
                    injuryHtml += `<div style="font-size: 14px; margin-top: 5px;">💥 <strong>${o.name}</strong> 受到重創，全能力下降 ${dmg}%！${auraStr}</div>`;
                    log(`💥 ${o.name} 在戰局中身受重傷，全能力下降 ${dmg}%！`);
                }
            }
        }
    });

    let resultHtml = `系統擲出 ${statRoll} 點，決定比拚【${statName}】！<br>攻方 (${attackerScore} 點) VS 守方加成後 (${defenderScore} 點)！`;
    if (reversalHtml) resultHtml += reversalHtml;
    if (growthHtml) {
        resultHtml += `<div style="margin-top: 15px; padding: 10px; background: rgba(76, 175, 80, 0.2); border: 1px solid #4CAF50; border-radius: 5px;">
            <div style="color: #4CAF50; font-weight: bold; margin-bottom: 5px;">【戰鬥成長】</div>
            ${growthHtml}
        </div>`;
    }
    if (injuryHtml) {
        resultHtml += `<div style="margin-top: 15px; padding: 10px; background: rgba(244, 67, 54, 0.2); border: 1px solid #F44336; border-radius: 5px;">
            <div style="color: #F44336; font-weight: bold; margin-bottom: 5px;">【將星隕落】</div>
            ${injuryHtml}
        </div>`;
    }

    // 吉星高照治療
    const teams = [
        { ids: attackingIds, name: attacker.name, healerId: preBattleAttackerLuckHealerId },
        { ids: defendingIds, name: defender.name, healerId: preBattleDefenderLuckHealerId }
    ];
    teams.forEach(team => {
        if (team.healerId) {
            const healer = getOfficer(team.healerId);
            const isSuperLucky = healer && getEffectiveStat(healer, 6) >= 101 && healer.injuryRate === 0;
            let injuredAllies = team.ids.filter(id => getOfficer(id).injuryRate > 0);
            if (injuredAllies.length > 0) {
                let healMsg = "";
                if (isSuperLucky) {
                    let healedNames = [];
                    injuredAllies.forEach(targetId => {
                        let target = getOfficer(targetId);
                        target.injuryRate = 0;
                        target.cumulativeInjury = Math.max(0, (target.cumulativeInjury || 0) - 50);
                        healedNames.push(target.name);
                    });
                    healMsg = `🍀 【天降甘霖】${healer.name} 運氣爆棚！戰後神蹟降臨，讓同隊伍的 ${healedNames.join('、')} 傷勢完全康復，並降低累積傷勢 50 點！`;
                } else {
                    let targetId = injuredAllies[Math.floor(Math.random() * injuredAllies.length)];
                    let target = getOfficer(targetId);
                    target.injuryRate = 0;
                    target.cumulativeInjury = Math.max(0, (target.cumulativeInjury || 0) - 50);
                    healMsg = `🍀 【吉星高照】${healer.name} 展現奇蹟，使 ${target.name} 的傷勢完全恢復，並降低累積傷勢 50 點！`;
                }
                log(healMsg);
                resultHtml += `<div style="margin-top: 10px; padding: 8px; background: rgba(255, 235, 59, 0.2); border: 1px solid #FBC02D; border-radius: 5px;">
                    <div style="color: #FBC02D; font-weight: bold; margin-bottom: 3px;">【幸運治療】</div>
                    <div style="font-size: 13px;">${healMsg}</div>
                </div>`;
            }
        }
    });

    GAME_STATE.isWaitingForAction = true;
    showModal(
        `攻城戰報 - 比拚【${statName}】`,
        resultHtml,
        () => {
            if (reversalProc) {
                log(`🛑 雙方因【神機妙算】絕境拼鬥，兩敗俱傷！${attacker.name} 撤隊而回，幸免於過路費損失。`);
                attacker.officers.push(...attackingIds);
                updateOfficerCountUI(attacker.id);
                endTurn();
            } else if (isAttackerWin) {
                log(`🔥 攻城勝利！${attacker.name} 奪下 ${landInfo.name}！`);
                defender.officers.push(...defendingIds);
                updateOfficerCountUI(defender.id);
                landInfo.owner = attacker.id;
                landInfo.defenders = attackingIds;
                if (landInfo.development && landInfo.development > 0 && Math.random() < 0.5) {
                    landInfo.development -= 1;
                    updateBoardUI();
                    log(`🏚️ 由於飽受戰火洗禮，${landInfo.name} 的建設等級下降為 Lv ${landInfo.development}。`);
                }
                const cell = document.getElementById(`cell-${landInfo.id}`);
                const ownerMarker = cell.querySelector('.owner-marker');
                ownerMarker.className = 'owner-marker';
                if (attacker.id === 1) ownerMarker.classList.add('owner-p1');
                if (attacker.id === 2) ownerMarker.classList.add('owner-p2');
                if (attacker.id === 3) ownerMarker.classList.add('owner-p3');
                if (attacker.id === 4) ownerMarker.classList.add('owner-p4');
                if (attacker.id === 5) ownerMarker.classList.add('owner-p5');
                endTurn();
            } else {
                const penalty = getCityToll(landInfo) * 2;
                log(`❌ 攻城失敗！${attacker.name} 損失慘重，支付雙倍過路費 $${penalty}！`);
                attacker.officers.push(...attackingIds);
                updateOfficerCountUI(attacker.id);
                payToll(attacker, defender, penalty);
            }
        },
        null, '確認戰果', null
    );

    if (attacker.isBot && defender.isBot) {
        setTimeout(() => {
            try {
                if (!UI.modal.classList.contains('hidden') && UI.modalTitle.textContent.includes('戰報')) {
                    const btn = document.getElementById('btn-modal-yes');
                    if (btn) btn.click();
                }
            } catch (e) {
                console.error("AI click modal error:", e);
                endTurn();
            }
        }, 3000);
    }
}
