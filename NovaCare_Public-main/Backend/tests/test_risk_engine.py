"""
Unit tests for app.services.risk_engine.

These are pure-function tests — no DB, no network. They verify:
  * the v2 composite scoring formula (idrs/symptom/voice/rppg weights) and rounding
  * that the adaptive symptom_score input actually moves the score and can move the tier
  * GREEN / AMBER / RED tier boundary behaviour under the v2 weights
  * the prediabetes trajectory heuristic and its labels
  * the component breakdown contributions
  * that localised text is wired through evaluate_risk()

These tests check that the implementation matches its documented v2 formula
(IDRS_WEIGHT=0.50, SYMPTOM_WEIGHT=0.20, VOICE_WEIGHT=0.20, RPPG_POINTS=10,
see app/services/risk_engine.py) and that symptom_score is real, wired input
(it flows from the ASHA adaptive-question engine through
app/routers/sessions.py into evaluate_risk — see IdrsSubmit.symptom_score in
app/schemas/session.py). They do not, and cannot, validate that these weights
are clinically correct — that is a product/medical decision outside test scope.
"""
import pytest

from app.services.risk_engine import (
    AMBER_MAX,
    GREEN_MAX,
    IDRS_WEIGHT,
    RPPG_POINTS,
    SYMPTOM_WEIGHT,
    TIER_AMBER,
    TIER_GREEN,
    TIER_RED,
    VOICE_WEIGHT,
    compute_composite,
    compute_prediabetes_trajectory,
    evaluate_risk,
)


# --------------------------------------------------------------------------- #
# Composite formula
# --------------------------------------------------------------------------- #
def test_weights_match_documented_v2_design():
    # Locks in the documented formula itself, so a silent weight change (e.g.
    # someone tweaking a constant without updating the module docstring or
    # these tests) is caught here rather than only showing up as a tier
    # boundary drifting somewhere else.
    assert IDRS_WEIGHT == pytest.approx(0.50)
    assert SYMPTOM_WEIGHT == pytest.approx(0.20)
    assert VOICE_WEIGHT == pytest.approx(0.20)
    assert RPPG_POINTS == pytest.approx(10.0)
    # At maximum plausible inputs the composite should land on exactly 100,
    # per the module docstring's "MAX possible ~= 100" design note.
    max_composite, _ = compute_composite(100, 1.0, True, symptom_score=1.0)
    assert max_composite == pytest.approx(100.0)


def test_composite_formula_all_components():
    # idrs 40*0.50=20 ; symptom 0.5*100*0.20=10 ; voice 0.6*100*0.20=12 ; rppg flag=10
    # => 52
    composite, breakdown = compute_composite(40, 0.6, True, symptom_score=0.5)
    assert composite == pytest.approx(52.0)
    assert breakdown.idrs_contribution == pytest.approx(20.0)
    assert breakdown.symptom_contribution == pytest.approx(10.0)
    assert breakdown.voice_contribution == pytest.approx(12.0)
    assert breakdown.rppg_contribution == pytest.approx(10.0)


def test_composite_zero_inputs():
    composite, breakdown = compute_composite(0, 0.0, False)
    assert composite == 0.0
    assert breakdown.idrs_contribution == 0.0
    assert breakdown.symptom_contribution == 0.0
    assert breakdown.voice_contribution == 0.0
    assert breakdown.rppg_contribution == 0.0


def test_rppg_flag_adds_fixed_points():
    without = compute_composite(10, 0.0, False)[0]
    with_flag = compute_composite(10, 0.0, True)[0]
    assert with_flag - without == pytest.approx(RPPG_POINTS)


def test_symptom_score_defaults_to_zero_when_omitted():
    # symptom_score is an optional, backward-compatible parameter: callers that
    # don't pass it (e.g. the doctor-facing /risk/compute tool, which has no
    # adaptive-question input) must not have it silently contribute anything.
    with_default = compute_composite(20, 0.4, False)[0]
    explicit_zero = compute_composite(20, 0.4, False, symptom_score=0.0)[0]
    assert with_default == pytest.approx(explicit_zero)


def test_symptom_score_scales_linearly_with_its_weight():
    # symptom_score=1.0 must contribute exactly SYMPTOM_WEIGHT*100 points, and
    # 0.5 must contribute exactly half that — this is the "adaptive symptom
    # triage" signal and it needs to actually move the score, not be a no-op.
    _, full = compute_composite(0, 0.0, False, symptom_score=1.0)
    _, half = compute_composite(0, 0.0, False, symptom_score=0.5)
    assert full.symptom_contribution == pytest.approx(SYMPTOM_WEIGHT * 100)
    assert half.symptom_contribution == pytest.approx(SYMPTOM_WEIGHT * 100 / 2)


def test_symptom_score_can_move_patient_from_green_to_amber():
    # Concrete demonstration that the new input is load-bearing: same idrs,
    # voice and rppg, only symptom_score changes, and it's enough on its own
    # to cross the GREEN/AMBER boundary. This checks the wiring/threshold
    # arithmetic works as documented, not that the boundary itself is
    # clinically correct.
    without_symptoms = evaluate_risk(60, 0.0, False)
    with_high_symptoms = evaluate_risk(60, 0.0, False, symptom_score=1.0)
    assert without_symptoms.tier == TIER_GREEN
    assert with_high_symptoms.tier == TIER_AMBER
    assert with_high_symptoms.composite_score - without_symptoms.composite_score == pytest.approx(20.0)


def test_composite_is_rounded_two_places():
    composite, _ = compute_composite(33, 0.333, True, symptom_score=0.333)
    # 33*0.50=16.5 ; 0.333*100*0.20=6.66 ; 0.333*100*0.20=6.66 ; +10 => 39.82
    assert composite == round(composite, 2)


# --------------------------------------------------------------------------- #
# Tier boundaries
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    "idrs,voice,rppg,expected",
    [
        (0, 0.0, False, TIER_GREEN),       # 0
        (60, 0.0, False, TIER_GREEN),      # 36 -> green
        (65, 0.0, False, TIER_AMBER),      # 39 ... see exact below
    ],
)
def test_tier_rough(idrs, voice, rppg, expected):
    # sanity smoke; exact boundary cases tested separately
    composite, _ = compute_composite(idrs, voice, rppg)
    result = evaluate_risk(idrs, voice, rppg)
    if composite < GREEN_MAX:
        assert result.tier == TIER_GREEN
    elif composite < AMBER_MAX:
        assert result.tier == TIER_AMBER
    else:
        assert result.tier == TIER_RED


def test_green_just_below_40():
    # idrs 79 * 0.50 = 39.5 -> just under GREEN_MAX
    r = evaluate_risk(79, 0.0, False)
    assert r.composite_score == pytest.approx(39.5)
    assert r.composite_score < GREEN_MAX
    assert r.tier == TIER_GREEN


def test_amber_at_exactly_40():
    # idrs 80 * 0.50 = 40 exactly -> AMBER (boundary is >= 40)
    r = evaluate_risk(80, 0.0, False)
    assert r.composite_score == pytest.approx(40.0)
    assert r.tier == TIER_AMBER


def test_amber_just_below_65():
    # idrs 100*0.50=50 ; voice 0.5*100*0.20=10 => 60, still AMBER
    r = evaluate_risk(100, 0.5, False)
    assert r.composite_score == pytest.approx(60.0)
    assert r.tier == TIER_AMBER


def test_red_at_exactly_65():
    # idrs 90*0.50=45 ; voice 0.5*100*0.20=10 ; rppg flag=10 => 65 exactly
    r = evaluate_risk(90, 0.5, True)
    assert r.composite_score == pytest.approx(65.0)
    assert r.tier == TIER_RED


def test_red_high():
    # Maximum plausible inputs across every component, including the adaptive
    # symptom signal: 50 + 20 + 20 + 10 = 100.
    r = evaluate_risk(100, 1.0, True, symptom_score=1.0)
    assert r.composite_score == pytest.approx(100.0)
    assert r.tier == TIER_RED


# --------------------------------------------------------------------------- #
# Prediabetes trajectory
# --------------------------------------------------------------------------- #
def test_trajectory_none_when_no_input():
    assert (
        compute_prediabetes_trajectory(None, None, False, False) is None
    )


def test_trajectory_stable_label():
    # waist 82 -> +10 only => 10 -> stable
    t = compute_prediabetes_trajectory(82, None, False, False)
    assert t is not None
    assert t.label == "stable"
    assert t.score == pytest.approx(10.0)


def test_trajectory_rising_label():
    # waist 92 (+22) + family (+15) = 37 -> rising
    t = compute_prediabetes_trajectory(92, None, False, True)
    assert t.label == "rising"
    assert "waist" in t.drivers
    assert "family_history" in t.drivers


def test_trajectory_high_risk_label_and_cap():
    # waist 105 (+35) + diet 100 (*0.25=25) + occupation (+15) + family (+15)
    # = 90 -> high_risk, and well under the 100 cap
    t = compute_prediabetes_trajectory(105, 100, True, True)
    assert t.label == "high_risk"
    assert t.score <= 100.0
    assert "diet" in t.drivers


def test_trajectory_score_never_exceeds_100():
    # Max achievable from the heuristic: waist 35 + diet 25 + occ 15 + family 15 = 90.
    # The min(score, 100) cap guarantees the score can never exceed 100 even if
    # weights are later increased.
    t = compute_prediabetes_trajectory(150, 100, True, True)
    assert t.score <= 100.0
    assert t.score == pytest.approx(90.0)


def test_trajectory_diet_driver_threshold():
    # dietary_score below 60 should not list 'diet' as a driver
    t = compute_prediabetes_trajectory(None, 40, False, True)
    assert "diet" not in t.drivers


# --------------------------------------------------------------------------- #
# evaluate_risk wiring
# --------------------------------------------------------------------------- #
def test_evaluate_risk_returns_localised_text():
    r = evaluate_risk(10, 0.1, False, lang="en")
    assert r.action_text
    assert r.explanation
    # explanation embeds the rounded score
    assert str(int(round(r.composite_score))) in r.explanation


def test_evaluate_risk_lang_changes_text():
    en = evaluate_risk(80, 0.5, True, lang="en")
    kn = evaluate_risk(80, 0.5, True, lang="kn")
    assert en.tier == kn.tier
    # localised strings should differ between languages
    assert en.action_text != kn.action_text


def test_evaluate_risk_includes_trajectory_when_inputs_present():
    r = evaluate_risk(
        40, 0.3, False,
        waist_cm=95, dietary_score=70,
        occupation_transition_flag=True, family_history_flag=False,
    )
    assert r.prediabetes_trajectory is not None
    assert r.prediabetes_trajectory.label in {"stable", "rising", "high_risk"}


def test_evaluate_risk_no_trajectory_when_absent():
    r = evaluate_risk(40, 0.3, False)
    assert r.prediabetes_trajectory is None
