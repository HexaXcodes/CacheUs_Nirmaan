import unittest
from uno_replay_bridge import Trigger, prepare


class BridgeTests(unittest.TestCase):
    def test_requires_out_and_ignores_duplicate_in(self):
        gate = Trigger(10)
        gate.feed('EVENT:FINGER_IN', 0)
        self.assertFalse(gate.due(20))
        gate.feed('EVENT:FINGER_OUT', 21)
        gate.feed('EVENT:FINGER_IN', 22)
        gate.feed('EVENT:FINGER_IN', 25)
        self.assertFalse(gate.due(31))
        self.assertTrue(gate.due(32))
        self.assertFalse(gate.due(33))
        gate.feed('EVENT:FINGER_IN', 34)
        self.assertFalse(gate.due(50))

    def test_removal_cancels_and_next_insertion_rearms(self):
        gate = Trigger(10)
        gate.feed('EVENT:FINGER_OUT', 0)
        gate.feed('EVENT:FINGER_IN', 1)
        gate.feed('EVENT:FINGER_OUT', 4)
        self.assertFalse(gate.due(20))
        gate.feed('EVENT:FINGER_IN', 21)
        self.assertTrue(gate.due(31))

    def test_restart_cancels_and_requires_out(self):
        gate = Trigger(10)
        gate.feed('EVENT:FINGER_OUT', 0)
        gate.feed('EVENT:FINGER_IN', 1)
        gate.feed('READY - start with finger removed', 2)
        self.assertFalse(gate.due(20))
        gate.feed('EVENT:FINGER_IN', 21)
        self.assertFalse(gate.due(40))

    def test_provenance_and_fixture_removal(self):
        original = {'samples': [1, 2], 'fixture': 'good', '_reference': {},
                    'metadata': {'source': 'dataset_simulator', 'synthetic': True,
                                 'device_id': 'bidmc-01', 'description': 'BIDMC'}}
        body = prepare(original, 'demo', 'intake')
        self.assertNotIn('fixture', body)
        self.assertNotIn('_reference', body)
        self.assertEqual(body['metadata']['source'], 'dataset_simulator')
        self.assertIn('not measured from current finger', body['metadata']['description'])
        self.assertEqual(body['metadata']['screening_id'], 'intake')
        self.assertIn('fixture', original)


if __name__ == '__main__':
    unittest.main()
